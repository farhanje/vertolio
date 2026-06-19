export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const datasets = [
  ['sessions', 'Sessions'],
  ['flow_steps', 'Flow steps'],
  ['task_runs', 'Task runs'],
  ['screen_events', 'Screen events'],
  ['survey_responses', 'Survey responses'],
]

export default function ResearchAdminPage() {
  return (
    <main className="container" style={{paddingTop: 96, paddingBottom: 96}}>
      <section className="section tight" style={{maxWidth: 860}}>
        <div className="kicker"><span className="dot" /> Research admin</div>
        <h1>Export research data</h1>
        <p className="lead" style={{maxWidth: 720}}>
          Download CSV files from Supabase runtime data. Study setup still lives in Sanity;
          this page is for results export only.
        </p>

        <form
          action="/api/research/export"
          method="get"
          style={{
            marginTop: 32,
            border: '1px solid var(--hair)',
            padding: 24,
            display: 'grid',
            gap: 18,
            background: 'rgba(11,11,11,.02)',
          }}
        >
          <label style={{display: 'grid', gap: 8}}>
            <span className="smallcaps">Study slug</span>
            <input
              name="studySlug"
              placeholder="kyc-autosave-ab"
              required
              style={{
                width: '100%',
                border: '1px solid var(--hair)',
                padding: '12px 14px',
                font: 'inherit',
                background: 'var(--bg)',
                color: 'var(--fg)',
              }}
            />
          </label>

          <label style={{display: 'grid', gap: 8}}>
            <span className="smallcaps">Dataset</span>
            <select
              name="dataset"
              defaultValue="sessions"
              style={{
                width: '100%',
                border: '1px solid var(--hair)',
                padding: '12px 14px',
                font: 'inherit',
                background: 'var(--bg)',
                color: 'var(--fg)',
              }}
            >
              {datasets.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label style={{display: 'grid', gap: 8}}>
            <span className="smallcaps">Export key</span>
            <input
              name="key"
              type="password"
              placeholder="RESEARCH_ADMIN_KEY"
              style={{
                width: '100%',
                border: '1px solid var(--hair)',
                padding: '12px 14px',
                font: 'inherit',
                background: 'var(--bg)',
                color: 'var(--fg)',
              }}
            />
            <span style={{fontSize: 13, color: 'var(--muted)'}}>
              In production, set RESEARCH_ADMIN_KEY in Vercel and enter the same value here.
            </span>
          </label>

          <div className="cta-row" style={{marginTop: 4}}>
            <button className="btn primary" type="submit">Download CSV</button>
            <a className="btn" href="/studio">Open Studio</a>
          </div>
        </form>

        <div style={{marginTop: 28, display: 'grid', gap: 10, color: 'var(--muted)', fontSize: 14}}>
          <p><strong>Recommended export order:</strong> sessions → flow steps → task runs → survey responses → screen events.</p>
          <p>CSV export is separated by dataset so analysis stays cleaner than one giant spreadsheet.</p>
        </div>
      </section>
    </main>
  )
}
