import {sanityFetch} from '../../lib/sanity.client'
import {SITE_SETTINGS_QUERY} from '../../lib/sanity.queries'
import {placeholderSiteSettings} from '../../lib/placeholders'
import {PortableText} from '@portabletext/react'
import {urlFor} from '../../lib/sanity.image'
import {getLanguage} from '../../lib/i18n.server'
import {pickLocalized, uiCopy} from '../../lib/i18n'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function resolveHref(raw) {
  const s = String(raw || '').trim()
  if (!s) return '#'
  return s
}

export default async function About() {
  const lang = getLanguage()
  const copy = uiCopy(lang)

  let settings = null
  try { settings = await sanityFetch(SITE_SETTINGS_QUERY) } catch (_) { settings = placeholderSiteSettings }

  const accent = settings?.pageAccents?.about || 'none'
  const about = settings?.about || {}

  const kickerPick = pickLocalized(about.kicker, about.kickerEn, lang)
  const titlePick = pickLocalized(about.title, about.titleEn, lang)
  const leadPick = pickLocalized(about.lead, about.leadEn, lang)
  const bodyPick = pickLocalized(about.body, about.bodyEn, lang)

  const kicker = kickerPick.value || 'Farhan Fauzan Jamaludin'
  const title = titlePick.value || copy.nav.about
  const lead = leadPick.value || ''
  const buttons = about.buttons || []
  const body = bodyPick.value || []
  const images = about.images || []

  const components = {
    block: {
      normal: ({children}) => <p className="lead" style={{ marginTop: 0, fontSize: 15 }}>{children}</p>,
      h2: ({children}) => <h2 style={{ marginTop: 28 }}>{children}</h2>,
      h3: ({children}) => <h3 style={{ marginTop: 20 }}>{children}</h3>,
    },
    list: {
      bullet: ({children}) => <ul className="lead" style={{ fontSize: 15 }}>{children}</ul>,
      number: ({children}) => <ol className="lead" style={{ fontSize: 15 }}>{children}</ol>,
    },
    marks: {
      link: ({value, children}) => {
        const href = value?.href || '#'
        const external = href.startsWith('http')
        return (
          <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
            {children}
          </a>
        )
      },
    },
  }

  return (
    <main className="container page-about" data-accent={accent}>
      <section className="section tight">
        <div className="grid12">
          <div className="col-left sticky-title" style={{ gridColumn: '1 / span 5' }}>
            <div className={kickerPick.nativeEnglish ? 'kicker notranslate' : 'kicker'}><span className="dot" /> {kicker}</div>
            <h1 className={titlePick.nativeEnglish || (lang === 'en' && !about.title) ? 'h1-tight notranslate' : 'h1-tight'}>{title}</h1>
          </div>

          <div className="col-right" style={{ gridColumn: '6 / span 7', paddingTop: 10 }}>
            {images?.length ? (
              <div className="about-gallery" style={{ marginTop: 0 }}>
                {images.slice(0, 12).map((it, i) => {
                  const img = it?.image
                  if (!img) return null
                  const url = urlFor(img).width(1400).quality(85).auto('format').url()
                  const altPick = pickLocalized(img?.alt, img?.altEn, lang)
                  const captionPick = pickLocalized(it?.caption, it?.captionEn, lang)
                  const alt = altPick.value || ''
                  return (
                    <figure key={i} className="about-fig">
                      <img src={url} alt={alt} loading="lazy" />
                      {captionPick.value ? <figcaption className={captionPick.nativeEnglish ? 'notranslate' : undefined}>{captionPick.value}</figcaption> : null}
                    </figure>
                  )
                })}
              </div>
            ) : null}

            {lead ? (
              <blockquote className={leadPick.nativeEnglish ? 'about-quote notranslate' : 'about-quote'}>{lead}</blockquote>
            ) : null}

            {buttons?.length ? (
              <div className="cta-row" style={{ marginTop: 14 }}>
                {buttons.slice(0, 4).map((b, idx) => {
                  const href = resolveHref(b.url)
                  const cls = b.style === 'primary' || idx === 0 ? 'btn primary' : 'btn'
                  const external = href.startsWith('http')
                  const labelPick = pickLocalized(b?.label, b?.labelEn, lang)
                  return (
                    <a
                      key={(labelPick.value || '') + href}
                      className={`${cls}${labelPick.nativeEnglish ? ' notranslate' : ''}`}
                      href={href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noreferrer' : undefined}
                    >
                      {labelPick.value}
                    </a>
                  )
                })}
              </div>
            ) : null}

            {body?.length ? (
              <div className={bodyPick.nativeEnglish ? 'notranslate' : undefined} style={{ marginTop: 18 }}>
                <PortableText value={body} components={components} />
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  )
}
