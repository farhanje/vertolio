import { supabaseServer } from '@/lib/supabase.server'
import { getPromoLlmConfig, getPromoLlmUsageSummary } from '@/lib/promo/llm'
import PromoAdminActions from './PromoAdminActions'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata = {
  title: 'Promo Automation Admin',
  robots: {index: false, follow: false, nocache: true},
}

function formatJakarta(value) {
  if (!value) return 'Never'
  return new Date(value).toLocaleString('en-GB', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function titleCase(value) {
  return String(value || '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function money(value) {
  return `$${Number(value || 0).toFixed(4)}`
}

function Metric({label, value, note}) {
  return (
    <div style={{border: '1px solid var(--hair)', padding: 16, minHeight: 112}}>
      <div style={{fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em'}}>{label}</div>
      <div style={{fontSize: 28, fontWeight: 800, marginTop: 5}}>{value}</div>
      {note ? <div style={{fontSize: 12, color: 'var(--muted)', marginTop: 5}}>{note}</div> : null}
    </div>
  )
}

function jobSummary(job) {
  const parts = []
  if (job.records_deterministic) parts.push(`${job.records_deterministic} parsed without AI`)
  if (job.records_ai_queued) parts.push(`${job.records_ai_queued} queued for bulk AI`)
  if (job.records_created) parts.push(`${job.records_created} new`)
  if (job.records_updated) parts.push(`${job.records_updated} updated`)
  if (job.records_unchanged) parts.push(`${job.records_unchanged} unchanged`)
  if (job.records_not_promotions) parts.push(`${job.records_not_promotions} non-promo rejected`)
  if (job.records_duplicates) parts.push(`${job.records_duplicates} duplicate blocked`)
  if (job.records_deleted) parts.push(`${job.records_deleted} expired removed`)
  if (job.records_llm_failed) parts.push(`${job.records_llm_failed} legacy AI failure`)
  return parts.length ? parts.join(' · ') : 'No promo changes detected'
}

export default async function PromoAdminPage() {
  const sb = supabaseServer()

  const [
    sourcesResult,
    jobsResult,
    promotionsResult,
    outletsResult,
    aiQueueResult,
    llmFailureResult,
    llmSuccessResult,
  ] = await Promise.all([
    sb.from('promo_sources').select('*').order('name'),
    sb.from('promo_ingestion_jobs').select('*').order('created_at', {ascending: false}).limit(12),
    sb.from('promotions').select('*'),
    sb.from('promo_outlets').select('id', {count: 'exact', head: true}),
    sb.from('promo_ai_resolution_queue').select('id,promotion_id,status,attempt_count,last_error,created_at,updated_at').limit(1000),
    sb.from('promo_llm_usage')
      .select('error_message,operation,model,created_at')
      .eq('status', 'failed')
      .eq('operation', 'promo_ambiguity_batch')
      .order('created_at', {ascending: false})
      .limit(1)
      .maybeSingle(),
    sb.from('promo_llm_usage')
      .select('model,created_at')
      .eq('status', 'success')
      .eq('operation', 'promo_ambiguity_batch')
      .order('created_at', {ascending: false})
      .limit(1)
      .maybeSingle(),
  ])

  const llmSummary = await getPromoLlmUsageSummary(sb)
  const llmConfig = getPromoLlmConfig()
  const sources = sourcesResult.data || []
  const jobs = jobsResult.data || []
  const promotions = promotionsResult.data || []
  const aiQueue = aiQueueResult.data || []
  const enabledSources = sources.filter((source) => source.enabled)
  const activeStatuses = new Set(['active', 'upcoming', 'expiring_soon'])
  const activeAiStatuses = new Set(['queued', 'running'])
  const activeAiPromotionIds = new Set(
    aiQueue.filter((item) => activeAiStatuses.has(item.status)).map((item) => item.promotion_id),
  )

  const livePromos = promotions.filter((promo) => promo.publication_status === 'published' && activeStatuses.has(promo.status))
  const deterministic = promotions.filter((promo) => promo.intelligence_method === 'rules').length
  const aiAssisted = promotions.filter((promo) => ['hybrid', 'gemini', 'cache'].includes(promo.intelligence_method)).length
  const verified = promotions.filter((promo) => promo.verification_status === 'verified').length
  const catalogListings = promotions.filter((promo) => promo.verification_status === 'catalog_listing').length
  const trueReviewCases = promotions.filter((promo) => (
    promo.verification_status === 'needs_attention'
    && !activeAiPromotionIds.has(promo.id)
  )).length
  const queuedAi = aiQueue.filter((item) => activeAiStatuses.has(item.status)).length
  const aiResolved = aiQueue.filter((item) => item.status === 'completed').length
  const aiFailed = aiQueue.filter((item) => item.status === 'failed').length
  const boundaryIssues = promotions.filter((promo) => ['unconfirmed', 'truncated'].includes(promo.boundary_status)).length
  const publishable = promotions.filter((promo) => promo.publishability_status === 'publishable').length
  const duplicates = promotions.filter((promo) => promo.verification_status === 'duplicate' || promo.duplicate_of).length
  const expiringSoon = promotions.filter((promo) => promo.status === 'expiring_soon').length
  const outletRows = outletsResult.count || 0
  const totalDeleted = jobs.reduce((sum, job) => sum + Number(job.records_deleted || 0), 0)
  const totalRejected = jobs.reduce((sum, job) => sum + Number(job.records_not_promotions || 0), 0)

  const categoryCounts = promotions.reduce((accumulator, promo) => {
    const key = promo.primary_category || 'other'
    accumulator[key] = (accumulator[key] || 0) + 1
    return accumulator
  }, {})
  const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 7)

  const latestAiFailure = llmFailureResult.error ? null : llmFailureResult.data
  const latestAiSuccess = llmSuccessResult.error ? null : llmSuccessResult.data
  const failureIsNewer = Boolean(latestAiFailure)
    && (!latestAiSuccess || new Date(latestAiFailure.created_at) > new Date(latestAiSuccess.created_at))
  const pipelineMigrationReady = !aiQueueResult.error
  const deterministicReady = enabledSources.length > 0 && pipelineMigrationReady
  const selectiveAiReady = deterministicReady && llmConfig.apiKeyConfigured

  const engineStatus = !enabledSources.length
    ? 'Add at least one source to start automatic collection'
    : !pipelineMigrationReady
      ? 'Deterministic-first database migration is required'
      : failureIsNewer
        ? 'Deterministic collection is active; the latest selective AI batch failed'
        : selectiveAiReady
          ? 'Deterministic collection and selective bulk AI are active'
          : 'Deterministic collection is active; unresolved items wait without AI'

  const engineBadge = !pipelineMigrationReady
    ? 'MIGRATION NEEDED'
    : failureIsNewer
      ? 'AI DEGRADED'
      : deterministicReady
        ? 'AUTOMATIC'
        : 'SETUP NEEDED'

  return (
    <main className="container" style={{paddingTop: 96, paddingBottom: 96}}>
      <section className="section tight">
        <div className="kicker"><span className="dot" /> Promo automation</div>
        <h1 style={{maxWidth: 900}}>Collect first with deterministic parsers. Use AI only where it earns its cost.</h1>
        <p className="lead" style={{maxWidth: 850}}>
          Each source discovers promo pages, isolates one promo between source-specific boundaries, parses usable fields with code, skips unchanged content, and batches only unresolved fields for selective AI. Expiry cleanup, deduplication, queue retries, and publishing run automatically.
        </p>

        <div style={{border: '1px solid var(--hair)', padding: 14, marginTop: 22, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center'}}>
          <div>
            <strong>{engineStatus}</strong>
            <div style={{fontSize: 13, color: 'var(--muted)', marginTop: 4}}>
              {enabledSources.length} active source(s) · selective Gemini {llmConfig.apiKeyConfigured ? 'configured' : 'unavailable'} · {money(llmSummary.estimatedCostUsd)} historical monthly usage from the ${Number(llmConfig.monthlyBudgetUsd || 5).toFixed(2)} hard cap
            </div>
          </div>
          <span style={{fontSize: 12, padding: '6px 9px', border: '1px solid var(--hair2)'}}>{engineBadge}</span>
        </div>

        {failureIsNewer ? (
          <div style={{border: '1px solid var(--hair)', padding: 14, marginTop: 12}}>
            <strong>Latest selective AI batch error</strong>
            <div style={{fontSize: 13, marginTop: 6}}>{latestAiFailure.error_message || 'Unknown Gemini error'}</div>
            <div style={{fontSize: 12, color: 'var(--muted)', marginTop: 5}}>
              {latestAiFailure.model || llmConfig.model} · {formatJakarta(latestAiFailure.created_at)}
            </div>
            <div style={{fontSize: 12, color: 'var(--muted)', marginTop: 8}}>
              Deterministic ingestion remains active. Unresolved records retry automatically once, then move to the true review queue instead of looping and spending repeatedly.
            </div>
          </div>
        ) : null}

        <PromoAdminActions sourceCount={enabledSources.length} llmConfig={llmConfig} llmSummary={llmSummary} />

        <div className="grid12" style={{marginTop: 34}}>
          <div style={{gridColumn: 'span 3'}}><Metric label="Live promos" value={livePromos.length} note="Published and currently usable" /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Parsed without AI" value={deterministic} note="Rules and source adapters only" /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="AI assisted" value={aiAssisted} note="Selective hybrid plus legacy AI records" /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Queued for bulk AI" value={queuedAi} note="Several unresolved promos per call" /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Publishable" value={publishable} note="Minimum user-facing fields complete" /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Verified" value={verified} note="Trusted, bounded, and publishable" /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Catalog listings" value={catalogListings} note="Known offer; validity not supplied" /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="True review cases" value={trueReviewCases} note="Not waiting for automatic AI resolution" /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Boundary issues" value={boundaryIssues} note="Begin/end could not be confirmed" /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="AI batches resolved" value={aiResolved} note={`${aiFailed} terminal batch item failure(s)`} /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Duplicates blocked" value={duplicates} note="Hidden from the public list" /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Expiring soon" value={expiringSoon} note="Seven days or less remaining" /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Expired removed" value={totalDeleted} note="Across recorded runs" /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Non-promos rejected" value={totalRejected} note="Pages that were not offers" /></div>
        </div>

        <div className="grid12" style={{marginTop: 24}}>
          <section style={{gridColumn: 'span 7', border: '1px solid var(--hair)', padding: 18}}>
            <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'}}>
              <strong>Source health</strong>
              <span style={{fontSize: 13, color: 'var(--muted)'}}>{outletRows} atomic outlet record(s)</span>
            </div>
            <div style={{display: 'grid', gap: 10, marginTop: 14}}>
              {sources.length ? sources.map((source) => (
                <div key={source.id} style={{borderTop: '1px solid var(--hair2)', paddingTop: 10, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12}}>
                  <div>
                    <a href={source.base_url} target="_blank" rel="noreferrer" style={{fontWeight: 700}}>{source.name}</a>
                    <div style={{fontSize: 12, color: 'var(--muted)', marginTop: 3}}>
                      {titleCase(source.adapter_key)} · Last success: {formatJakarta(source.last_success_at)}
                    </div>
                  </div>
                  <div style={{textAlign: 'right', fontSize: 12}}>
                    <div>{titleCase(source.status)}</div>
                    <div style={{color: 'var(--muted)', marginTop: 3}}>{source.consecutive_failure_count || 0} failure(s)</div>
                  </div>
                </div>
              )) : <div style={{color: 'var(--muted)'}}>No sources configured yet.</div>}
            </div>
          </section>

          <section style={{gridColumn: 'span 5', border: '1px solid var(--hair)', padding: 18}}>
            <strong>Category coverage</strong>
            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14}}>
              {topCategories.length ? topCategories.map(([category, count]) => (
                <span key={category} style={{border: '1px solid var(--hair2)', padding: '7px 9px', fontSize: 13}}>{titleCase(category)} · {count}</span>
              )) : <span style={{color: 'var(--muted)'}}>No categorized promos yet.</span>}
            </div>
          </section>
        </div>

        <div className="hr" style={{margin: '42px 0'}} />

        <section>
          <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'end', flexWrap: 'wrap'}}>
            <div>
              <h2 style={{marginBottom: 5}}>Recent automatic source runs</h2>
              <p style={{margin: 0, color: 'var(--muted)'}}>Normal operation requires no button press or manual cleanup.</p>
            </div>
            {trueReviewCases ? <a href="/promo-admin/review" className="btn">Inspect {trueReviewCases} genuine exception(s)</a> : null}
          </div>
          <div style={{display: 'grid', gap: 10, marginTop: 18}}>
            {jobs.length ? jobs.map((job) => {
              const source = sources.find((item) => item.id === job.source_id)
              return (
                <div key={job.id} style={{border: '1px solid var(--hair)', padding: 14}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'}}>
                    <strong>{source?.name || 'Unknown source'}</strong>
                    <span style={{fontSize: 12, color: 'var(--muted)'}}>{formatJakarta(job.created_at)}</span>
                  </div>
                  <div style={{fontSize: 14, color: 'var(--muted)', marginTop: 7}}>{jobSummary(job)}</div>
                  {job.error_message ? <div style={{fontSize: 13, marginTop: 7}}>Error: {job.error_message}</div> : null}
                </div>
              )
            }) : <p className="lead">No source runs yet.</p>}
          </div>
        </section>
      </section>
    </main>
  )
}
