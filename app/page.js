import {sanityFetch} from '../lib/sanity.client'
import {SITE_SETTINGS_QUERY, HOME_FEATURED_PROJECTS_QUERY, HOME_FEATURED_POSTS_QUERY} from '../lib/sanity.queries'
import {placeholderSiteSettings} from '../lib/placeholders'
import CardMedia from '../components/CardMedia'
import HeroTicker from '../components/HeroTicker'
import MarqueeText from '../components/MarqueeText'
import {urlFor} from '../lib/sanity.image'
import {getLanguage} from '../lib/i18n.server'
import {pickLocalized, uiCopy} from '../lib/i18n'

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
  return h ? b.width(w).height(h).fit('crop').quality(85).auto('format').url() : b.width(w).quality(85).auto('format').url()
}

export default async function Home() {
  const lang = getLanguage()
  const copy = uiCopy(lang)

  let settings = null
  try { settings = await sanityFetch(SITE_SETTINGS_QUERY) } catch (_) { settings = null }

  const s = settings || placeholderSiteSettings
  const accent = s?.pageAccents?.home || 'none'

  const name = s?.name || 'Farhan'
  const taglinePick = pickLocalized(s?.tagline, s?.taglineEn, lang)
  const subtitlePick = pickLocalized(s?.heroSubtitle, s?.heroSubtitleEn, lang)
  const tagline = taglinePick.value || ''
  const subtitle = subtitlePick.value || ''

  const defaultLinks = [
    { label: `${copy.nav.work} →`, url: '/work', nativeEnglish: lang === 'en' },
    { label: `${copy.nav.blog} →`, url: '/blog', nativeEnglish: lang === 'en' },
    { label: `${copy.nav.resume} →`, url: '/resume', nativeEnglish: lang === 'en' },
  ]

  const links = s?.links?.length
    ? s.links.map((l) => {
        const labelPick = pickLocalized(l?.label, l?.labelEn, lang)
        return {...l, label: labelPick.value, nativeEnglish: labelPick.nativeEnglish}
      })
    : defaultLinks

  const heroDesk = s?.heroPortraitDesktop
  const heroMob = s?.heroPortraitMobile

  const heroDeskUrl = heroImageUrl(heroDesk, 1200, 1500)
  const heroMobUrl = heroImageUrl(heroMob, 1600, 1067)
  const deskAltPick = pickLocalized(heroDesk?.alt, heroDesk?.altEn, lang)
  const mobAltPick = pickLocalized(heroMob?.alt, heroMob?.altEn, lang)
  const heroAlt = deskAltPick.value || mobAltPick.value || 'Portrait'

  let featuredWork = (s?.featuredWork || []).slice(0, 4)
  let featuredPosts = (s?.featuredPosts || []).slice(0, 4)

  if (featuredWork.length === 0) {
    try { featuredWork = await sanityFetch(HOME_FEATURED_PROJECTS_QUERY) } catch (_) {}
  }
  if (featuredPosts.length === 0) {
    try { featuredPosts = await sanityFetch(HOME_FEATURED_POSTS_QUERY) } catch (_) {}
  }

  const tickerPick = pickLocalized(s?.heroTickerWords, s?.heroTickerWordsEn, lang)
  const tickerWords = tickerPick.value || []

  return (
    <main className="container page-home" data-accent={accent}>
      <section className="section tight hero-wrap">
        <HeroTicker words={tickerWords} nativeEnglish={tickerPick.nativeEnglish} />

        <div className="hero-grid" style={{ position: 'relative', zIndex: 1 }}>
          <div>
            {tagline ? <div className={taglinePick.nativeEnglish ? 'kicker notranslate' : 'kicker'}><span className="dot" /> {tagline}</div> : null}
            <h1 className="h1-tight notranslate">{name}</h1>
            {subtitle ? <p className={subtitlePick.nativeEnglish ? 'lead notranslate' : 'lead'}>{subtitle}</p> : null}
            <div className="cta-row">
              {links.slice(0, 3).map((l, idx) => (
                <a
                  key={l.url}
                  className={`${idx === 0 ? 'btn primary' : 'btn'}${l.nativeEnglish ? ' notranslate' : ''}`}
                  href={l.url}
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          <div className="hero-photo">
            {heroDeskUrl ? (
              <img className="hero-img hero-img-desktop" src={heroDeskUrl} alt={heroAlt} />
            ) : (
              <img className="avatar hero-img hero-img-desktop" src="/avatar-placeholder.svg" alt="Portrait placeholder" />
            )}

            {heroMobUrl ? (
              <img className="hero-img hero-img-mobile" src={heroMobUrl} alt={heroAlt} />
            ) : null}
          </div>
        </div>
      </section>

      <div className="hr" />

      <section className="section">
        <div className="grid12" style={{ alignItems: 'stretch' }}>
          <div style={{ gridColumn: '1 / span 12' }}><h2 className={lang === 'en' ? 'notranslate' : undefined}>{copy.featuredWork}</h2></div>
          {featuredWork.map((p) => {
            const titlePick = pickLocalized(p?.title, p?.titleEn, lang)
            const summaryPick = pickLocalized(p?.summary, p?.summaryEn, lang)
            const tagsPick = pickLocalized(p?.tags, p?.tagsEn, lang)
            const altPick = pickLocalized(p?.cardImage?.alt, p?.cardImage?.altEn, lang)
            const tags = [p.organization?.name, ...(tagsPick.value || [])].filter(Boolean)
            const { visible, extra } = buildTagSet(tags, 4)
            const desc = trunc(summaryPick.value || '', 300)

            return (
              <a key={p.slug?.current} className="card card-link" style={{ gridColumn: 'span 6' }} href={`/work/${p.slug?.current}`}>
                <CardMedia image={p.cardImage} alt={altPick.value} logo={p.organization?.logo} />
                <div className="card-body">
                  <h3 className={titlePick.nativeEnglish ? 'notranslate' : undefined}>{titlePick.value}</h3>
                  <p className={summaryPick.nativeEnglish ? 'notranslate' : undefined}>{desc}<span className="more"> …</span></p>
                </div>
                <div className={tagsPick.nativeEnglish ? 'meta tags card-meta notranslate' : 'meta tags card-meta'}>
                  {visible.map((t) => <TagPill key={t} text={t} />)}
                  {extra ? <span className="pill morepill">+{extra}</span> : null}
                </div>
              </a>
            )
          })}

          <div style={{ gridColumn: '1 / span 12', marginTop: 34 }}>
            <div className="hr" />
          </div>

          <div style={{ gridColumn: '1 / span 12', marginTop: 10 }}><h2 className={lang === 'en' ? 'notranslate' : undefined}>{copy.featuredPosts}</h2></div>
          {featuredPosts.map((p) => {
            const titlePick = pickLocalized(p?.title, p?.titleEn, lang)
            const excerptPick = pickLocalized(p?.excerpt, p?.excerptEn, lang)
            const tagsPick = pickLocalized(p?.tags, p?.tagsEn, lang)
            const altPick = pickLocalized(p?.cardImage?.alt, p?.cardImage?.altEn, lang)
            const tags = tagsPick.value || []
            const { visible, extra } = buildTagSet(tags, 4)
            const desc = trunc(excerptPick.value || '', 300)

            return (
              <a key={p.slug?.current} className="card card-link" style={{ gridColumn: 'span 6' }} href={`/blog/${p.slug?.current}`}>
                <CardMedia image={p.cardImage} alt={altPick.value} badge={p.publishedAt ? new Date(p.publishedAt).toISOString().slice(0,10) : ''} />
                <div className="card-body">
                  <h3 className={titlePick.nativeEnglish ? 'notranslate' : undefined}>{titlePick.value}</h3>
                  <p className={excerptPick.nativeEnglish ? 'notranslate' : undefined}>{desc}<span className="more"> …</span></p>
                </div>
                <div className={tagsPick.nativeEnglish ? 'meta tags card-meta notranslate' : 'meta tags card-meta'}>
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
