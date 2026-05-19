import {sanityFetch} from '../../lib/sanity.client'
import {SITE_SETTINGS_QUERY} from '../../lib/sanity.queries'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function ResumePage() {
  const settings = await sanityFetch(SITE_SETTINGS_QUERY)
  const url = settings?.resumePdf?.asset?.url
  const filename = settings?.resumePdf?.asset?.originalFilename || 'resume.pdf'

  return (
    <main className="container">
      <section className="section tight">
        <div className="kicker"><span className="dot" /> Resume</div>
        <h1>Resume</h1>
        <p className="lead">
          {url ? 'Download or preview the latest PDF.' : 'Resume PDF is not available yet.'}
        </p>
      </section>

      <div className="hr" />

      <section className="section">
        {!url ? (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>No resume uploaded</h3>
          </div>
        ) : (
          <>
            <div className="cta-row" style={{ marginBottom: 14 }}>
              <a className="btn primary" href={url} target="_blank" rel="noreferrer">Open PDF →</a>
              <a className="btn" href={url} download={filename}>Download</a>
            </div>

            <div className="resume-frame card">
              <iframe title="Resume PDF" src={url} />
            </div>

            <p className="resume-note">If the preview fails on your device, use “Open PDF”.</p>
          </>
        )}
      </section>
    </main>
  )
}
