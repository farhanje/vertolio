import {sanity} from '../lib/sanity.client'
import {SITE_SETTINGS_QUERY} from '../lib/sanity.queries'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const settings = await sanity.fetch(SITE_SETTINGS_QUERY)

  const name = settings?.name || 'Farhan'
  const tagline = settings?.tagline || 'UI/UX • research-driven • metrics-minded'
  const subtitle = settings?.heroSubtitle || 'Portfolio + Blog powered by Sanity. Edit content in Studio.'
  const links = settings?.links || [
    { label: 'Work →', url: '/work' },
    { label: 'Blog →', url: '/blog' },
    { label: 'Studio →', url: '/studio' },
  ]

  const featured = settings?.featuredWork || []

  return (
    <main className="container">
      <section className="section tight">
        <div className="hero-grid">
          <div>
            <div className="kicker"><span className="dot" /> {tagline}</div>
            <h1>{name}</h1>
            <p className="lead">{subtitle}</p>
            <div className="cta-row">
              {links.slice(0, 3).map((l) => (
                <a key={l.url} className={l.url === '/work' ? 'btn primary' : 'btn'} href={l.url}>{l.label}</a>
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
              Edit these in Studio → Site Settings → Featured work.
            </p>
          </div>

          {featured.map((p) => (
            <a key={p.slug?.current} className="card card-link span-6" href={`/work/${p.slug?.current}`}>
              <h3>{p.title}</h3>
              <p>{p.summary || ''}</p>
              <div className="meta">
                {p.organization?.name && <span className="pill">{p.organization.name}</span>}
                {(p.tags || []).slice(0, 3).map((t) => <span key={t} className="pill">{t}</span>)}
              </div>
            </a>
          ))}

          {featured.length === 0 && (
            <div className="card span-12">
              <h3 style={{ marginTop: 0 }}>Nothing featured yet</h3>
              <p>
                Open Studio, create Organizations + Projects, then set Site Settings → Featured work.
              </p>
              <div className="cta-row" style={{ marginTop: 12 }}>
                <a className="btn primary" href="/studio">Open Studio →</a>
                <a className="btn" href="/work">Go to Work →</a>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
