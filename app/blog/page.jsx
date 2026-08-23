import {sanityFetch} from '../../lib/sanity.client'
import {SITE_SETTINGS_QUERY, BLOG_INDEX_QUERY} from '../../lib/sanity.queries'
import {placeholderSiteSettings} from '../../lib/placeholders'
import EditorialCard from '../../components/EditorialCard'
import {getLanguage} from '../../lib/i18n.server'
import {pickLocalized, uiCopy} from '../../lib/i18n'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function safeDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function postCardData(p, lang, index, featured = false) {
  const titlePick = pickLocalized(p?.title, p?.titleEn, lang)
  const excerptPick = pickLocalized(p?.excerpt, p?.excerptEn, lang)
  const tagsPick = pickLocalized(p?.tags, p?.tagsEn, lang)
  const altPick = pickLocalized(p?.cardImage?.alt, p?.cardImage?.altEn, lang)
  const typeLabel = featured
    ? (lang === 'en' ? 'FEATURED JOURNAL' : 'CATATAN UTAMA')
    : (lang === 'en' ? 'JOURNAL' : 'CATATAN')

  return {
    title: titlePick.value,
    summary: excerptPick.value,
    image: p?.cardImage,
    alt: altPick.value,
    index: `${String(index).padStart(2, '0')} / ${typeLabel}`,
    eyebrow: safeDate(p?.publishedAt),
    meta: (tagsPick.value || []).slice(0, 3),
    featured,
    titleClassName: titlePick.nativeEnglish ? 'notranslate' : '',
    summaryClassName: excerptPick.nativeEnglish ? 'notranslate' : '',
  }
}

export default async function BlogIndex() {
  const lang = getLanguage()
  const copy = uiCopy(lang)

  let settings = null
  let posts = []

  try {
    ;[settings, posts] = await Promise.all([
      sanityFetch(SITE_SETTINGS_QUERY),
      sanityFetch(BLOG_INDEX_QUERY),
    ])
  } catch (_) {
    settings = placeholderSiteSettings
    posts = []
  }

  const accent = settings?.pageAccents?.blog || 'none'
  const [featuredPost, ...supportingPosts] = posts || []

  return (
    <main className="container page-blog" data-accent={accent}>
      <section className="section tight blog-hero">
        <div className="grid12">
          <div className="blog-hero-title">
            <div className="kicker"><span className="dot" /> <span className="notranslate">Farhan Fauzan Jamaludin</span></div>
            <h1 className={lang === 'en' ? 'h1-tight notranslate' : 'h1-tight'}>{copy.nav.blog}</h1>
          </div>
          <div className="blog-hero-intro">
            <p className={lang === 'en' ? 'lead notranslate' : 'lead'}>{copy.blogIntro}</p>
          </div>
        </div>
      </section>

      <div className="hr" />

      <section className="section blog-list editorial-index-section">
        {featuredPost?.slug?.current ? (
          <EditorialCard
            href={`/blog/${featuredPost.slug.current}`}
            className="blog-featured-card"
            {...postCardData(featuredPost, lang, 1, true)}
          />
        ) : null}

        {supportingPosts.length ? (
          <div className="grid12 editorial-support-grid blog-support-grid">
            {supportingPosts.map((p, idx) => p?.slug?.current ? (
              <EditorialCard
                key={p.slug.current}
                href={`/blog/${p.slug.current}`}
                className="blog-support-card"
                {...postCardData(p, lang, idx + 2, false)}
              />
            ) : null)}
          </div>
        ) : null}

        {(!posts || posts.length === 0) ? (
          <div className="editorial-empty">
            <h3 className={lang === 'en' ? 'notranslate' : undefined}>{copy.noPosts}</h3>
          </div>
        ) : null}
      </section>
    </main>
  )
}
