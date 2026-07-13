import { supabaseServer } from '@/lib/supabase.server'
import { getPromoLlmConfig, getPromoLlmUsageSummary } from '@/lib/promo/llm'
import PromoAdminActions from './PromoAdminActions'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata = {
  title: 'Promo Intelligence Admin',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
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
  return String(value || '').split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
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
  if (job.records_ai_enriched) parts.push(`${job.records_ai_enriched} AI-processed`)
  if (job.records_created) parts.push(`${job.records_created} new`)
  if (job.records_updated) parts.push(`${job.records_updated} updated`)
  if (job.records_not_promotions) parts.push(`${job.records_not_promotions} non-promo rejected`)
  if (job.records_duplicates) parts.push(`${job.records_duplicates} duplicate blocked`)
  if (job.records_deleted) parts.push(`${job.records_deleted} expired removed`)
  if (job.records_unchanged) parts.push(`${job.records_unchanged} unchanged`)
  if (job.records_llm_failed) parts.push(`${job.records_llm_failed} AI failure`)
  return parts.length ? parts.join(' · ') : 'No promo changes detected'
}

export default async function PromoAdminPage() {
  const sb = supabaseServer()

  const [sourcesResult, jobsResult, promotionsResult, outletsResult, llmFailureResult, llmSuccessResult] = await Promise.all([
    sb.from('promo_sources').select('*').order('name'),
    sb.from('promo_ingestion_jobs').select('*').order('created_at', {ascending: false}).limit(12),
    sb.from('promotions').select('*'),
    sb.from('promo_outlets').select('id', {count: 'exact', head: true}),
    sb.from('promo_llm_usage')
      .select('error_message,operation,model,created_at')
      .eq('status', 'failed')
      .eq('operation', 'full_promo_extraction')
      .order('created_at', {ascending: false})
      .limit(1)
      .maybeSingle(),
    sb.from('promo_llm_usage')
      .select('model,created_at')
      .eq('status', 'success')
      .eq('operation', 'full_promo_extraction')
      .order('created_at', {ascending: false})
      .limit(1)
      .maybeSingle(),
  ])

  const llmSummary = await getPromoLlmUsageSummary(sb)
  const llmConfig = getPromoLlmConfig()
  const latestAiFailure = llmFailureResult.error ? null : llmFailureResult.data
  const latestAiSuccess = llmSuccessResult.error ? null : llmSuccessResult.data
  const sources = sourcesResult.data || []
  const jobs = jobsResult.data || []
  const promotions = promotionsResult.data || []
  const enabledSources = sources.filter((source) => source.enabled)
  const activeStatuses = new Set(['active', 'upcoming', 'expiring_soon'])
  const livePromos = promotions.filter((promo) => promo.publication_status === 'published' && activeStatuses.has(promo.status))
  const aiProcessed = promotions.filter((promo) => ['gemini', 'cache'].includes(promo.intelligence_method)).length
  const verified = promotions.filter((promo) => promo.verification_status === 'verified').length
  const needsAttention = promotions.filter((promo) => promo.verification_status === 'needs_attention').length
  const duplicates = promotions.filter((promo) => promo.verification_status === 'duplicate' || promo.duplicate_of).length
  const expiringSoon = promotions.filter((promo) => promo.status === 'expiring_soon').length
  const trusted = promotions.filter((promo) => ['official_source', 'trusted_aggregator'].includes(promo.source_trust_level)).length
  const outletRows = outletsResult.count || 0
  const totalDeleted = jobs.reduce((sum, job) => sum + Number(job.records_deleted || 0), 0)
  const totalRejected = jobs.reduce((sum, job) => sum + Number(job.records_not_promotions || 0), 0)

  const categoryCounts = promotions.reduce((accumulator, promo) => {
    const key = promo.primary_category || 'other'
    accumulator[key] = (accumulator[key] || 0) + 1
    return accumulator
  }, {})
  const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 7)

  const databaseReady = llmSummary.available
  const hasFullAiSuccess = aiProcessed > 0 || Boolean(latestAiSuccess)
  const failureIsNewer = Boolean(latestAiFailure) && (!latestAiSuccess || new Date(latestAiFailure.created_at) > new Date(latestAiSuccess.created_at))
  const aiFailing = llmConfig.apiKeyConfigured && !hasFullAiSuccess && failureIsNewer
  const engineReady = enabledSources.length > 0 && llmConfig.apiKeyConfigured && databaseReady && hasFullAiSuccess

  const engineStatus = aiFailing
    ? 'Gemini key is configured, but full promo extraction has not succeeded'
    : engineReady
      ? 'Full Gemini promo extraction is active'
      : !enabledSources.length
        ? 'Add at least one source to start'
        : !llmConfig.apiKeyConfigured
          ? 'Running with rules only — Gemini key is missing'
          : !databaseReady
            ? 'Database migration is required before full AI extraction'
            : 'Gemini key configured — run the promo engine to verify full extraction'

  const engineBadge = aiFailing
    ? 'AI ERROR'
    : engineReady
      ? 'AI ACTIVE'
      : llmConfig.apiKeyConfigured && databaseReady
        ? 'READY TO TEST'
        : 'SETUP NEEDED'

  return (
    <main className="container" style={{paddingTop: 96, paddingBottom: 96}}>
      <section className="section tight">
        <div className="kicker"><span className="dot" /> Promo intelligence</div>
        <h1 style={{maxWidth: 860}}>One engine for collecting, understanding, and cleaning promos</h1>
        <p className="lead" style={{maxWidth: 820}}>
          The system checks official sources, extracts the full offer with Gemini, verifies dates and benefit mechanics, classifies category and location, blocks duplicates, and removes expired promos.
        </p>

        <div style={{border: '1px solid var(--hair)', padding: 14, marginTop: 22, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center'}}>
          <div>
            <strong>{engineStatus}</strong>
            <div style={{fontSize: 13, color: 'var(--muted)', marginTop: 4}}>
              {enabledSources.length} active source(s) · Gemini API key {llmConfig.apiKeyConfigured ? 'configured' : 'missing'} · {money(llmSummary.estimatedCostUsd)} used from the ${Number(llmConfig.monthlyBudgetUsd || 5).toFixed(2)} application cap
            </div>
          </div>
          <span style={{fontSize: 12, padding: '6px 9px', border: '1px solid var(--hair2)'}}>{engineBadge}</span>
        </div>

        {aiFailing ? (
          <div style={{border: '1px solid var(--hair)', padding: 14, marginTop: 12}}>
            <strong>Latest full extraction error</strong>
            <div style={{fontSize: 13, marginTop: 6}}>{latestAiFailure.error_message || 'Unknown Gemini error'}</div>
            <div style={{fontSize: 12, color: 'var(--muted)', marginTop: 5}}>
              {latestAiFailure.model || llmConfig.model} · {formatJakarta(latestAiFailure.created_at)}
            </div>
            <div style={{fontSize: 12, color: 'var(--muted)', marginTop: 8}}>
              Supabase rows stay on rules + needs_attention until a full Gemini extraction succeeds. The migration itself does not verify promotions.
            </div>
          </div>
        ) : null}

        <PromoAdminActions
          sourceCount={enabledSources.length}
          llmConfig={llmConfig}
          llmSummary={llmSummary}
        />

        <div className="grid12" style={{marginTop: 34}}>
          <div style={{gridColumn: 'span 3'}}><Metric label="Live promos" value={livePromos.length} note="Published and currently usable" /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="AI processed" value={aiProcessed} note="Full Gemini extraction or cache" /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Verified" value={verified} note={`${trusted} from trusted source domains`} /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Needs attention" value={needsAttention} note="Missing or conflicting critical terms" /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Duplicates blocked" value={duplicates} note="Hidden from the public list" /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Expiring soon" value={expiringSoon} note="Seven days or less remaining" /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Expired removed" value={totalDeleted} note="Across recorded runs" /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Non-promos rejected" value={totalRejected} note="Pages that were not actual offers" /></div>
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
                    <div style={{fontSize: 12, color: 'var(--muted)', marginTop: 3}}>Last success: {formatJakarta(source.last_success_at)}</div>
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
              <h2 style={{marginBottom: 5}}>Recent automatic updates</h2>
              <p style={{margin: 0, color: 'var(--muted)'}}>A readable summary of what each source run actually did.</p>
            </div>
            {needsAttention ? <a href="/promo-admin/review" className="btn">Inspect {needsAttention} flagged promo(s)</a> : null}
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
