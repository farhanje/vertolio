import {sanityFetch} from '../lib/sanity.client'
import {SITE_SETTINGS_QUERY, HOME_FEATURED_PROJECTS_QUERY, HOME_FEATURED_POSTS_QUERY} from '../lib/sanity.queries'
import {placeholderSiteSettings} from '../lib/placeholders'
import CardMedia from '../components/CardMedia'
import HeroTicker from '../components/HeroTicker'
import MarqueeText from '../components/MarqueeText'
import {urlFor} from '../lib/sanity.image'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function trunc(input, max = 260) {
  const s = String(input || '').trim().replace(/\s+/g, ' ')
  if (!s) return ''
  if (s.length <= max) return s
  return s.slice(0, Math.max(0, max - 1)).trimEnd() + '…'
}

function TagPill({text}) {
  return (
    <span className="pill">
      <MarqueeText text={text} />
    </span>
  )
}

function buildTagSet(tags = [], cap = 4) {
  const visible = tags.slice(0, cap)
  const extra = Math.max(0, tags.length - visible.length)
  const v = (extra > 0 && visible.length % 2 === 1) ? visible.slice(0, Math.max(0, visible.length - 1)) : visible
  const e = Math.max(0, tags.length - v.length)
  return { visible: v, extra: e }
}

function heroImageUrl(img, w, h) {
  if (!img) return null
  const b = urlFor(img)
  if (!b) return img?.asset?.url || null
  // If h given, keep it art-directed; otherwise just width.
  return h ? b.width(w).height(h).fit('crop').quality(85).auto('format').url() : b.width(w).quality(85).auto('format').url()
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

  const heroDesk = s?.heroPortraitDesktop
  const heroMob = s?.heroPortraitMobile

  const heroDeskUrl = heroImageUrl(heroDesk, 1200, 1500) // 4:5 default crop
  const heroMobUrl = heroImageUrl(heroMob, 1600, 1067) // 3:2 default crop

  const heroAlt = heroDesk?.alt || heroMob?.alt || 'Portrait'

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

          <div className="hero-photo">
            {/* Desktop portrait */}
            {heroDeskUrl ? (
              <img className="hero-img hero-img-desktop" src={heroDeskUrl} alt={heroAlt} />
            ) : (
              <img className="avatar hero-img hero-img-desktop" src="/avatar-placeholder.svg" alt="Portrait placeholder" />
            )}

            {/* Mobile / tablet wide */}
            {heroMobUrl ? (
              <img className="hero-img hero-img-mobile" src={heroMobUrl} alt={heroAlt} />
            ) : null}
          </div>
        </div>
      </section>

      <div className="hr" />

      <section className="section">
        <div className="grid12" style={{ alignItems: 'stretch' }}>
          <div style={{ gridColumn: '1 / span 12' }}><h2>Featured work</h2></div>
          {featuredWork.map((p) => {
            const tags = [p.organization?.name, ...(p.tags || [])].filter(Boolean)
            const { visible, extra } = buildTagSet(tags, 4)
            const desc = trunc(p.summary || '', 300)

            return (
              <a key={p.slug?.current} className="card card-link" style={{ gridColumn: 'span 6' }} href={`/work/${p.slug?.current}`}>
                <CardMedia image={p.cardImage} alt={p.cardImage?.alt} logo={p.organization?.logo} />
                <div className="card-body">
                  <h3>{p.title}</h3>
                  <p>{desc}<span className="more"> …</span></p>
                </div>
                <div className="meta tags card-meta">
                  {visible.map((t) => <TagPill key={t} text={t} />)}
                  {extra ? <span className="pill morepill">+{extra}</span> : null}
                </div>
              </a>
            )
          })}

          <div style={{ gridColumn: '1 / span 12', marginTop: 34 }}>
            <div className="hr" />
          </div>

          <div style={{ gridColumn: '1 / span 12', marginTop: 10 }}><h2>Featured posts</h2></div>
          {featuredPosts.map((p) => {
            const tags = (p.tags || [])
            const { visible, extra } = buildTagSet(tags, 4)
            const desc = trunc(p.excerpt || '', 300)

            return (
              <a key={p.slug?.current} className="card card-link" style={{ gridColumn: 'span 6' }} href={`/blog/${p.slug?.current}`}>
                <CardMedia image={p.cardImage} alt={p.cardImage?.alt} badge={p.publishedAt ? new Date(p.publishedAt).toISOString().slice(0,10) : ''} />
                <div className="card-body">
                  <h3>{p.title}</h3>
                  <p>{desc}<span className="more"> …</span></p>
                </div>
                <div className="meta tags card-meta">
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
