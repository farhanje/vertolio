import {sanityFetch} from '../lib/sanity.client'
import {SITE_SETTINGS_QUERY, HOME_FEATURED_PROJECTS_QUERY, HOME_FEATURED_POSTS_QUERY} from '../lib/sanity.queries'
import {placeholderSiteSettings} from '../lib/placeholders'
import EditorialCard from '../components/EditorialCard'
import HeroTicker from '../components/HeroTicker'
import {urlFor} from '../lib/sanity.image'
import {getLanguage} from '../lib/i18n.server'
import {pickLocalized, uiCopy} from '../lib/i18n'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function heroImageUrl(img, w, h) {
  if (!img) return null
  const b = urlFor(img)
  if (!b) return img?.asset?.url || null
  return h ? b.width(w).height(h).fit('crop').quality(85).auto('format').url() : b.width(w).quality(85).auto('format').url()
}

function yearOf(date) {
  if (!date) return ''
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? '' : String(d.getFullYear())
}

function dateOf(date) {
  if (!date) return ''
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function projectCardData(p, lang, index, featured = false) {
  const titlePick = pickLocalized(p?.title, p?.titleEn, lang)
  const summaryPick = pickLocalized(p?.summary, p?.summaryEn, lang)
  const tagsPick = pickLocalized(p?.tags, p?.tagsEn, lang)
  const altPick = pickLocalized(p?.cardImage?.alt, p?.cardImage?.altEn, lang)
  const statLabelPick = pickLocalized(p?.cardStat?.label, p?.cardStat?.labelEn, lang)
  const typeLabel = featured
    ? (lang === 'en' ? 'FEATURED CASE STUDY' : 'STUDI KASUS UTAMA')
    : (lang === 'en' ? 'CASE STUDY' : 'STUDI KASUS')

  return {
    title: titlePick.value,
    summary: summaryPick.value,
    image: p?.cardImage,
    alt: altPick.value,
    logo: p?.organization?.logo,
    index: `${String(index).padStart(2, '0')} / ${typeLabel}`,
    eyebrow: p?.organization?.name,
    meta: [...(tagsPick.value || []).slice(0, 2), yearOf(p?.date)].filter(Boolean),
    statValue: p?.cardStat?.value,
    statLabel: statLabelPick.value,
    featured,
    titleClassName: titlePick.nativeEnglish ? 'notranslate' : '',
    summaryClassName: summaryPick.nativeEnglish ? 'notranslate' : '',
  }
}

function postCardData(p, lang, index) {
  const titlePick = pickLocalized(p?.title, p?.titleEn, lang)
  const excerptPick = pickLocalized(p?.excerpt, p?.excerptEn, lang)
  const tagsPick = pickLocalized(p?.tags, p?.tagsEn, lang)
  const altPick = pickLocalized(p?.cardImage?.alt, p?.cardImage?.altEn, lang)
  const journalLabel = lang === 'en' ? 'JOURNAL' : 'CATATAN'

  return {
    title: titlePick.value,
    summary: excerptPick.value,
    image: p?.cardImage,
    alt: altPick.value,
    index: `${String(index).padStart(2, '0')} / ${journalLabel}`,
    eyebrow: dateOf(p?.publishedAt),
    meta: (tagsPick.value || []).slice(0, 3),
    featured: false,
    titleClassName: titlePick.nativeEnglish ? 'notranslate' : '',
    summaryClassName: excerptPick.nativeEnglish ? 'notranslate' : '',
  }
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
    {label: `${copy.nav.work} →`, url: '/work', nativeEnglish: lang === 'en'},
    {label: `${copy.nav.blog} →`, url: '/blog', nativeEnglish: lang === 'en'},
    {label: `${copy.nav.resume} →`, url: '/resume', nativeEnglish: lang === 'en'},
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

  // Existing Site Settings curation remains the source of truth and preserves manual order.
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
  const [homeFlagship, ...homeSupporting] = featuredWork

  return (
    <main className="container page-home" data-accent={accent}>
      <section className="section tight hero-wrap">
        <HeroTicker words={tickerWords} nativeEnglish={tickerPick.nativeEnglish} />

        <div className="hero-grid" style={{position: 'relative', zIndex: 1}}>
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
            {heroMobUrl ? <img className="hero-img hero-img-mobile" src={heroMobUrl} alt={heroAlt} /> : null}
          </div>
        </div>
      </section>

      <div className="hr" />

      <section className="section home-editorial-section">
        <div className="home-section-head">
          <h2 className={lang === 'en' ? 'notranslate' : undefined}>{copy.featuredWork}</h2>
          <a className="editorial-section-link" href="/work">{lang === 'en' ? 'All work →' : 'Semua karya →'}</a>
        </div>

        {homeFlagship?.slug?.current ? (
          <EditorialCard
            href={`/work/${homeFlagship.slug.current}`}
            className="home-featured-card"
            {...projectCardData(homeFlagship, lang, 1, true)}
          />
        ) : null}

        {homeSupporting.length ? (
          <div className={`grid12 home-work-support home-work-support-count-${homeSupporting.length}`}>
            {homeSupporting.map((p, idx) => p?.slug?.current ? (
              <EditorialCard
                key={p.slug.current}
                href={`/work/${p.slug.current}`}
                className="home-support-card"
                {...projectCardData(p, lang, idx + 2, false)}
              />
            ) : null)}
          </div>
        ) : null}

        <div className="home-section-divider hr" />

        <div className="home-section-head home-posts-head">
          <h2 className={lang === 'en' ? 'notranslate' : undefined}>{copy.featuredPosts}</h2>
          <a className="editorial-section-link" href="/blog">{lang === 'en' ? 'All writing →' : 'Semua tulisan →'}</a>
        </div>

        <div className="grid12 home-post-grid">
          {featuredPosts.map((p, idx) => p?.slug?.current ? (
            <EditorialCard
              key={p.slug.current}
              href={`/blog/${p.slug.current}`}
              className="home-post-card"
              {...postCardData(p, lang, idx + 1)}
            />
          ) : null)}
        </div>
      </section>
    </main>
  )
}
