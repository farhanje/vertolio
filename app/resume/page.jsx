import {sanityFetch} from '../../lib/sanity.client'
import {SITE_SETTINGS_QUERY} from '../../lib/sanity.queries'
import {getLanguage} from '../../lib/i18n.server'
import {uiCopy} from '../../lib/i18n'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function ResumePage() {
  const lang = getLanguage()
  const copy = uiCopy(lang)
  const settings = await sanityFetch(SITE_SETTINGS_QUERY)
  const accent = settings?.pageAccents?.resume || 'none'

  const url = settings?.resumePdf?.asset?.url
  const filename = settings?.resumePdf?.asset?.originalFilename || 'resume.pdf'

  const viewerUrl = url ? `${url}#view=FitH` : null
  const nativeClass = lang === 'en' ? ' notranslate' : ''

  return (
    <main className="container page-resume" data-accent={accent}>
      <section className="section tight">
        <div className="grid12">
          <div className="col-left sticky-title" style={{ gridColumn: '1 / span 5' }}>
            <div className="kicker"><span className="dot" /> <span className="notranslate">Farhan Fauzan Jamaludin</span></div>
            <h1 className={`h1-tight${nativeClass}`}>{copy.resumeTitle}</h1>
            <p className={`lead${nativeClass}`} style={{ marginTop: 10 }}>
              {url ? copy.resumeLatest : copy.resumeUnavailable}
            </p>
            {url ? (
              <div className="cta-row">
                <a className={`btn primary${nativeClass}`} href={url} target="_blank" rel="noreferrer">{copy.openPdf}</a>
                <a className={`btn${nativeClass}`} href={url} download={filename}>{copy.download}</a>
              </div>
            ) : null}
          </div>

          <div className="col-right" style={{ gridColumn: '6 / span 7' }}>
            {!url ? (
              <div className="card">
                <h3 className={lang === 'en' ? 'notranslate' : undefined} style={{ margin: 0 }}>{copy.noResume}</h3>
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
