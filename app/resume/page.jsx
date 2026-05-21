import {sanityFetch} from '../../lib/sanity.client'
import {SITE_SETTINGS_QUERY} from '../../lib/sanity.queries'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function ResumePage() {
  const settings = await sanityFetch(SITE_SETTINGS_QUERY)
  const accent = settings?.pageAccents?.resume || 'none'

  const url = settings?.resumePdf?.asset?.url
  const filename = settings?.resumePdf?.asset?.originalFilename || 'resume.pdf'

  const viewerUrl = url ? `${url}#view=FitH` : null

  return (
    <main className="container page-resume" data-accent={accent}>
      <section className="section tight">
        <div className="grid12">
          <div className="col-left sticky-title" style={{ gridColumn: '1 / span 5' }}>
            <div className="kicker"><span className="dot" /> Farhan Fauzan Jamaludin</div>
            <h1 className="h1-tight">Resume</h1>
            <p className="lead" style={{ marginTop: 10 }}>
              {url ? 'Latest PDF.' : 'Resume PDF is not available yet.'}
            </p>
            {url ? (
              <div className="cta-row">
                <a className="btn primary" href={url} target="_blank" rel="noreferrer">Open PDF →</a>
                <a className="btn" href={url} download={filename}>Download</a>
              </div>
            ) : null}
          </div>

          <div className="col-right" style={{ gridColumn: '6 / span 7' }}>
            {!url ? (
              <div className="card">
                <h3 style={{ margin: 0 }}>No resume uploaded</h3>
              </div>
            ) : (
              <div className="resume-frame resume-frame-big">
                <iframe title="Resume PDF" src={viewerUrl} />
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
