import {sanityFetch} from '../lib/sanity.client'
import {SITE_SETTINGS_QUERY} from '../lib/sanity.queries'
import {placeholderSiteSettings} from '../lib/placeholders'
import CardMedia from '../components/CardMedia'
import HeroTicker from '../components/HeroTicker'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function Home() {
  let settings = null
  try {
    settings = await sanityFetch(SITE_SETTINGS_QUERY)
  } catch (_) {
    settings = null
  }

  const s = settings || placeholderSiteSettings

  const name = s?.name || 'Farhan'
  const tagline = s?.tagline || 'UI/UX • research-driven • metrics-minded'
  const subtitle = s?.heroSubtitle || 'Portfolio + Blog powered by Sanity. Edit content in Studio.'
  const links = s?.links || [
    { label: 'Work →', url: '/work' },
    { label: 'Blog →', url: '/blog' },
  ]

  const featuredWork = s?.featuredWork || []
  const featuredPosts = s?.featuredPosts || []
  const tickerWords = s?.heroTickerWords || []

  return (
    <main className="container">
      <section className="section tight" style={{ position: 'relative' }}>
        <HeroTicker words={tickerWords} />

        <div className="hero-grid" style={{ position: 'relative', zIndex: 1 }}>
          <div>
            <div className="kicker"><span className="dot" /> {tagline}</div>
            <h1>{name}</h1>
            <p className="lead">{subtitle}</p>
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
        <div className="grid">
          <div className="span-12">
            <h2 style={{ margin: 0 }}>Featured work</h2>
            <p className="lead" style={{ marginTop: 10 }}>
              Controlled from Sanity → Site Settings → Featured work.
            </p>
          </div>

          {featuredWork.map((p) => (
            <a key={p.slug?.current} className="card card-link span-6" href={`/work/${p.slug?.current}`}>
              <CardMedia image={p.cardImage} alt={p.cardImage?.alt} logo={p.organization?.logo} />
              <h3>{p.title}</h3>
              <p>{p.summary || ''}</p>
              <div className="meta">
                {p.organization?.name && <span className="pill">{p.organization.name}</span>}
                {(p.tags || []).slice(0, 3).map((t) => <span key={t} className="pill">{t}</span>)}
              </div>
            </a>
          ))}

          <div className="span-12" style={{ marginTop: 10 }}>
            <h2 style={{ margin: 0 }}>Featured posts</h2>
            <p className="lead" style={{ marginTop: 10 }}>
              Controlled from Sanity → Site Settings → Featured posts.
            </p>
          </div>

          {featuredPosts.map((p) => (
            <a key={p.slug?.current} className="card card-link span-6" href={`/blog/${p.slug?.current}`}>
              <CardMedia image={p.cardImage} alt={p.cardImage?.alt} />
              <h3>{p.title}</h3>
              <p>{p.excerpt || ''}</p>
              <div className="meta">
                {p.publishedAt && <span className="pill">{new Date(p.publishedAt).toISOString().slice(0,10)}</span>}
                {(p.tags || []).slice(0, 3).map((t) => <span key={t} className="pill">{t}</span>)}
              </div>
            </a>
          ))}

          {(featuredWork.length === 0 && featuredPosts.length === 0) && (
            <div className="card span-12">
              <h3 style={{ marginTop: 0 }}>Nothing featured yet</h3>
              <p>Open Sanity Studio → Site Settings → choose Featured work and Featured posts.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
