import {sanityFetch} from '../../lib/sanity.client'
import {SITE_SETTINGS_QUERY} from '../../lib/sanity.queries'
import {placeholderSiteSettings} from '../../lib/placeholders'
import {PortableText} from '@portabletext/react'
import {urlFor} from '../../lib/sanity.image'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function resolveHref(raw) {
  const s = String(raw || '').trim()
  if (!s) return '#'
  return s
}

export default async function About() {
  let settings = null
  try { settings = await sanityFetch(SITE_SETTINGS_QUERY) } catch (_) { settings = placeholderSiteSettings }

  const accent = settings?.pageAccents?.about || 'none'
  const about = settings?.about || {}

  const kicker = about.kicker || 'Farhan Fauzan Jamaludin'
  const title = about.title || 'About'
  const lead = about.lead || ''
  const buttons = about.buttons || []
  const body = about.body || []
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
            <div className="kicker"><span className="dot" /> {kicker}</div>
            <h1 className="h1-tight">{title}</h1>
          </div>

          <div className="col-right" style={{ gridColumn: '6 / span 7', paddingTop: 10 }}>
            {/* Gallery first */}
            {images?.length ? (
              <div className="about-gallery" style={{ marginTop: 0 }}>
                {images.slice(0, 12).map((it, i) => {
                  const img = it?.image
                  if (!img) return null
                  const url = urlFor(img).width(1400).quality(85).auto('format').url()
                  const alt = img?.alt || ''
                  return (
                    <figure key={i} className="about-fig">
                      <img src={url} alt={alt} loading="lazy" />
                      {it?.caption ? <figcaption>{it.caption}</figcaption> : null}
                    </figure>
                  )
                })}
              </div>
            ) : null}

            {/* Lead as quote */}
            {lead ? (
              <blockquote className="about-quote">{lead}</blockquote>
            ) : null}

            {buttons?.length ? (
              <div className="cta-row" style={{ marginTop: 14 }}>
                {buttons.slice(0, 4).map((b, idx) => {
                  const href = resolveHref(b.url)
                  const cls = b.style === 'primary' || idx === 0 ? 'btn primary' : 'btn'
                  const external = href.startsWith('http')
                  return (
                    <a
                      key={b.label + href}
                      className={cls}
                      href={href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noreferrer' : undefined}
                    >
                      {b.label}
                    </a>
                  )
                })}
              </div>
            ) : null}

            {body?.length ? (
              <div style={{ marginTop: 18 }}>
                <PortableText value={body} components={components} />
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  )
}
