import {sanityFetch} from '../lib/sanity.client'
import {SITE_SETTINGS_QUERY, HOME_FEATURED_PROJECTS_QUERY, HOME_FEATURED_POSTS_QUERY} from '../lib/sanity.queries'
import {placeholderSiteSettings} from '../lib/placeholders'
import CardMedia from '../components/CardMedia'
import HeroTicker from '../components/HeroTicker'
import MarqueeText from '../components/MarqueeText'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function TagPill({text}) {
  return (
    <span className="pill">
      <MarqueeText text={text} />
    </span>
  )
}

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

  let featuredWork = (s?.featuredWork || []).slice(0, 4)
  let featuredPosts = (s?.featuredPosts || []).slice(0, 4)

  if (featuredWork.length === 0) {
    try { featuredWork = await sanityFetch(HOME_FEATURED_PROJECTS_QUERY) } catch (_) {}
  }
  if (featuredPosts.length === 0) {
    try { featuredPosts = await sanityFetch(HOME_FEATURED_POSTS_QUERY) } catch (_) {}
  }

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
        <div className="grid12" style={{ alignItems: 'stretch' }}>
          <div style={{ gridColumn: '1 / span 12' }}><h2>Featured work</h2></div>
          {featuredWork.map((p) => {
            const tags = p.tags || []
            const visible = tags.slice(0, 4)
            const extra = Math.max(0, tags.length - visible.length)
            return (
              <a key={p.slug?.current} className="card card-link" style={{ gridColumn: 'span 6' }} href={`/work/${p.slug?.current}`}>
                <CardMedia image={p.cardImage} alt={p.cardImage?.alt} logo={p.organization?.logo} />
                <h3>{p.title}</h3>
                <p>
                  {p.summary || ''}
                  <span className="more">→ click more</span>
                </p>
                <div className="meta tags">
                  {p.organization?.name && <TagPill text={p.organization.name} />}
                  {visible.map((t) => <TagPill key={t} text={t} />)}
                  {extra ? <span className="pill morepill">+{extra}</span> : null}
                </div>
              </a>
            )
          })}

          <div style={{ gridColumn: '1 / span 12', marginTop: 6 }}><h2>Featured posts</h2></div>
          {featuredPosts.map((p) => {
            const tags = p.tags || []
            const visible = tags.slice(0, 4)
            const extra = Math.max(0, tags.length - visible.length)
            return (
              <a key={p.slug?.current} className="card card-link" style={{ gridColumn: 'span 6' }} href={`/blog/${p.slug?.current}`}>
                <CardMedia image={p.cardImage} alt={p.cardImage?.alt} />
                <h3>{p.title}</h3>
                <p>
                  {p.excerpt || ''}
                  <span className="more">→ click more</span>
                </p>
                <div className="meta tags">
                  {p.publishedAt && <TagPill text={new Date(p.publishedAt).toISOString().slice(0,10)} />}
                  {visible.map((t) => <TagPill key={t} text={t} />)}
                  {extra ? <span className="pill morepill">+{extra}</span> : null}
                </div>
              </a>
            )
          })}
        </div>
      </section>
    </main>
  )
}
