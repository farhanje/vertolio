import { supabaseServer } from '@/lib/supabase.server'
import { listPromotionSourceAdapters } from '@/lib/promo-sources/registry'
import PromoAdminActions from './PromoAdminActions'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata = {
  title: 'Promo Automation Admin',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

function formatJakarta(value) {
  if (!value) return null
  return new Date(value).toLocaleString('en-GB', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function Metric({label, value}) {
  return (
    <div style={{border: '1px solid var(--hair)', padding: 16}}>
      <div style={{fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em'}}>{label}</div>
      <div style={{fontSize: 28, fontWeight: 800, marginTop: 4}}>{value}</div>
    </div>
  )
}

function titleCase(value) {
  return String(value || '').split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

export default async function PromoAdminPage() {
  const sb = supabaseServer()

  const [sourcesResult, jobsResult, reviewResult, promotionsResult, outletsResult] = await Promise.all([
    sb.from('promo_sources').select('*').order('name'),
    sb.from('promo_ingestion_jobs').select('*').order('created_at', {ascending: false}).limit(20),
    sb.from('promo_review_queue').select('id', {count: 'exact', head: true}).in('status', ['pending','in_review']),
    sb.from('promotions').select('id,publication_status,status,created_at,primary_category,cities,outlet_count,segmentation_method'),
    sb.from('promo_outlets').select('id', {count: 'exact', head: true}),
  ])

  const sources = sourcesResult.data || []
  const jobs = jobsResult.data || []
  const promotions = promotionsResult.data || []
  const adapters = listPromotionSourceAdapters()
  const activeJobs = jobs.filter((job) => ['queued','running','retrying'].includes(job.status))
  const today = new Date().toISOString().slice(0, 10)
  const foundToday = promotions.filter((promo) => String(promo.created_at || '').startsWith(today)).length
  const autoPublished = promotions.filter((promo) => promo.publication_status === 'published').length
  const categorized = promotions.filter((promo) => promo.primary_category && promo.primary_category !== 'other').length
  const cityTagged = promotions.filter((promo) => (promo.cities || []).length > 0).length
  const llmSorted = promotions.filter((promo) => promo.segmentation_method === 'llm_hybrid').length
  const openReviews = reviewResult.count || 0
  const outletRows = outletsResult.count || 0

  const categoryCounts = promotions.reduce((accumulator, promo) => {
    const key = promo.primary_category || 'other'
    accumulator[key] = (accumulator[key] || 0) + 1
    return accumulator
  }, {})
  const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)

  return (
    <main className="container" style={{paddingTop: 96, paddingBottom: 96}}>
      <section className="section tight">
        <div className="kicker"><span className="dot" /> Promo intelligence admin</div>
        <h1 style={{maxWidth: 900}}>Automated sources, segmentation, and location coverage</h1>
        <p className="lead" style={{maxWidth: 800}}>
          The ingestion worker now sorts promos automatically by category and geographic scope. Expired promos are removed automatically; review remains available only as a fallback.
        </p>

        <PromoAdminActions
          sources={sources.map(({id, name}) => ({id, name}))}
          adapters={adapters}
        />

        <div className="grid12" style={{marginTop: 36}}>
          <div style={{gridColumn: 'span 3'}}><Metric label="Healthy sources" value={sources.filter((s) => s.status === 'healthy').length} /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Active jobs" value={activeJobs.length} /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Auto-published" value={autoPublished} /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Promos found today" value={foundToday} /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Categorized" value={categorized} /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="City-tagged" value={cityTagged} /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="Atomic outlets" value={outletRows} /></div>
          <div style={{gridColumn: 'span 3'}}><Metric label="LLM-sorted" value={llmSorted} /></div>
        </div>

        {topCategories.length ? (
          <div style={{border: '1px solid var(--hair)', padding: 18, marginTop: 24}}>
            <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'}}>
              <strong>Current category distribution</strong>
              <a href="/promo-admin/review" style={{fontSize: 13, color: 'var(--muted)'}}>Fallback review ({openReviews})</a>
            </div>
            <div style={{display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14}}>
              {topCategories.map(([category, count]) => (
                <span key={category} style={{border: '1px solid var(--hair2)', padding: '7px 10px', fontSize: 13}}>
                  {titleCase(category)} · {count}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="hr" style={{margin: '44px 0'}} />

        <div className="grid12">
          <div style={{gridColumn: 'span 12'}}>
            <h2>Sources</h2>
          </div>
          <div style={{gridColumn: 'span 12', overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 14}}>
              <thead>
                <tr>
                  {['Source','Adapter','Status','Last success','Next run','Failures','Auto publish'].map((label) => (
                    <th key={label} style={{textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid var(--hair)'}}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sources.length ? sources.map((source) => (
                  <tr key={source.id}>
                    <td style={{padding: '12px 8px', borderBottom: '1px solid var(--hair2)'}}>
                      <a href={source.base_url} target="_blank" rel="noreferrer">{source.name}</a>
                    </td>
                    <td style={{padding: '12px 8px', borderBottom: '1px solid var(--hair2)'}}>{source.adapter_key}</td>
                    <td style={{padding: '12px 8px', borderBottom: '1px solid var(--hair2)'}}>{source.status}</td>
                    <td style={{padding: '12px 8px', borderBottom: '1px solid var(--hair2)'}}>{source.last_success_at ? formatJakarta(source.last_success_at) : 'Never'}</td>
                    <td style={{padding: '12px 8px', borderBottom: '1px solid var(--hair2)'}}>{source.next_run_at ? formatJakarta(source.next_run_at) : 'Not scheduled'}</td>
                    <td style={{padding: '12px 8px', borderBottom: '1px solid var(--hair2)'}}>{source.consecutive_failure_count}</td>
                    <td style={{padding: '12px 8px', borderBottom: '1px solid var(--hair2)'}}>{source.auto_publish_enabled ? 'Automatic' : 'Confidence gated'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" style={{padding: '18px 8px', color: 'var(--muted)'}}>
                      No sources yet. Use “Install BCA + Ultra Voucher” above, or add another official public source.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="hr" style={{margin: '44px 0'}} />

        <div className="grid12">
          <div style={{gridColumn: 'span 12'}}>
            <h2>Recent ingestion jobs</h2>
          </div>
          <div style={{gridColumn: 'span 12', display: 'grid', gap: 10, marginTop: 16}}>
            {jobs.length ? jobs.map((job) => (
              <div key={job.id} style={{border: '1px solid var(--hair)', padding: 14}}>
                <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'}}>
                  <strong>{job.status}</strong>
                  <span style={{fontSize: 12, color: 'var(--muted)'}}>{formatJakarta(job.created_at)}</span>
                </div>
                <div style={{fontSize: 13, color: 'var(--muted)', marginTop: 8}}>
                  Discovered {job.records_discovered || 0} · Created {job.records_created || 0} · Updated {job.records_updated || 0} ·
                  Unchanged {job.records_unchanged || 0} · Deleted expired {job.records_deleted || 0} · Skipped expired {job.records_expired_skipped || 0}
                </div>
                {job.error_message ? <div style={{fontSize: 13, marginTop: 8}}>{job.error_message}</div> : null}
              </div>
            )) : <p className="lead">No ingestion jobs have run yet.</p>}
          </div>
        </div>
      </section>
    </main>
  )
}
