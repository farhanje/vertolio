import ResearchAdminExport from './ResearchAdminExport'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata = {
  title: 'Research Admin',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

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

        <ResearchAdminExport />

        <div style={{marginTop: 28, display: 'grid', gap: 10, color: 'var(--muted)', fontSize: 14}}>
          <p><strong>Recommended export order:</strong> sessions → flow steps → task runs → survey responses → screen events.</p>
          <p>CSV export is separated by dataset so analysis stays cleaner than one giant spreadsheet.</p>
        </div>
      </section>
    </main>
  )
}
