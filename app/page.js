import {sanityFetch} from '../lib/sanity.client'
import {SITE_SETTINGS_QUERY} from '../lib/sanity.queries'
import {placeholderSiteSettings} from '../lib/placeholders'
import CardMedia from '../components/CardMedia'
import HeroTicker from '../components/HeroTicker'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function Home() {
  let settings = null
  try { settings = await sanityFetch(SITE_SETTINGS_QUERY) } catch (_) { settings = null }

  const s = settings || placeholderSiteSettings
  const accent = s?.pageAccents?.home || 'none'

  const name = s?.name || 'Farhan'
  const tagline = s?.tagline || ''
  const subtitle = s?.heroSubtitle || ''
  const links = s?.links || [
    { label: 'Work →', url: '/work' },
    { label: 'Blog →', url: '/blog' },
    { label: 'Resume →', url: '/resume' },
  ]

  const featuredWork = (s?.featuredWork || []).slice(0, 4)
  const featuredPosts = (s?.featuredPosts || []).slice(0, 4)
  const tickerWords = s?.heroTickerWords || []

  return (
    <main className="container page-home" data-accent={accent}>
      <section className="section tight hero-wrap">
        <HeroTicker words={tickerWords} />

        <div className="hero-grid" style={{ position: 'relative', zIndex: 1 }}>
          <div>
            {tagline ? <div className="kicker"><span className="dot" /> {tagline}</div> : null}
            <h1 className="h1-tight">{name}</h1>
            {subtitle ? <p className="lead">{subtitle}</p> : null}
            <div className="cta-row">
              {links.slice(0, 3).map((l, idx) => (
                <a key={l.url} className={idx === 0 ? 'btn primary' : 'btn'} href={l.url}>{l.label}</a>
              ))}
            </div>
          </div>
          <div>
            <img className="avatar" src="/avatar-placeholder.svg" alt="Portrait placeholder" />
          </div>
        </div>
      </section>

      <div className="hr" />

      <section className="section">
        <div className="grid12">
          <div style={{ gridColumn: '1 / span 12' }}><h2>Featured work</h2></div>
          {featuredWork.map((p) => (
            <a key={p.slug?.current} className="card card-link" style={{ gridColumn: 'span 6' }} href={`/work/${p.slug?.current}`}>
              <CardMedia image={p.cardImage} alt={p.cardImage?.alt} logo={p.organization?.logo} />
              <h3>{p.title}</h3>
              <p>{p.summary || ''}</p>
              <div className="meta">
                {p.organization?.name && <span className="pill">{p.organization.name}</span>}
                {(p.tags || []).slice(0, 3).map((t) => <span key={t} className="pill">{t}</span>)}
              </div>
            </a>
          ))}

          <div style={{ gridColumn: '1 / span 12', marginTop: 6 }}><h2>Featured posts</h2></div>
          {featuredPosts.map((p) => (
            <a key={p.slug?.current} className="card card-link" style={{ gridColumn: 'span 6' }} href={`/blog/${p.slug?.current}`}>
              <CardMedia image={p.cardImage} alt={p.cardImage?.alt} />
              <h3>{p.title}</h3>
              <p>{p.excerpt || ''}</p>
              <div className="meta">
                {p.publishedAt && <span className="pill">{new Date(p.publishedAt).toISOString().slice(0,10)}</span>}
                {(p.tags || []).slice(0, 3).map((t) => <span key={t} className="pill">{t}</span>)}
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  )
}
