import {sanityFetch} from '../../lib/sanity.client'
import {SITE_SETTINGS_QUERY, BLOG_INDEX_QUERY} from '../../lib/sanity.queries'
import {placeholderSiteSettings} from '../../lib/placeholders'
import CardMedia from '../../components/CardMedia'
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

function trunc(input, max = 320) {
  const s = String(input || '').trim().replace(/\s+/g, ' ')
  if (!s) return ''
  if (s.length <= max) return s
  return s.slice(0, Math.max(0, max - 1)).trimEnd() + '…'
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

  return (
    <main className="container page-blog" data-accent={accent}>
      <section className="section tight">
        <div className="grid12">
          <div style={{ gridColumn: '1 / span 8' }}>
            <div className="kicker"><span className="dot" /> <span className="notranslate">Farhan Fauzan Jamaludin</span></div>
            <h1 className={lang === 'en' ? 'h1-tight notranslate' : 'h1-tight'}>{copy.nav.blog}</h1>
          </div>
          <div style={{ gridColumn: '9 / span 4', paddingTop: 10 }}>
            <p className={lang === 'en' ? 'lead notranslate' : 'lead'}>{copy.blogIntro}</p>
          </div>
        </div>
      </section>

      <div className="hr" />

      <section className="section blog-list">
        <div className="grid12" style={{ alignItems: 'stretch' }}>
          {(posts || []).map((p) => {
            const slug = p?.slug?.current
            if (!slug) return null
            const date = safeDate(p.publishedAt)
            const titlePick = pickLocalized(p?.title, p?.titleEn, lang)
            const excerptPick = pickLocalized(p?.excerpt, p?.excerptEn, lang)
            const tagsPick = pickLocalized(p?.tags, p?.tagsEn, lang)
            const altPick = pickLocalized(p?.cardImage?.alt, p?.cardImage?.altEn, lang)
            const desc = trunc(excerptPick.value || '', 320)

            return (
              <a
                key={slug}
                className="card card-link"
                style={{ gridColumn: 'span 6' }}
                href={`/blog/${slug}`}
              >
                <CardMedia image={p.cardImage} alt={altPick.value} badge={date} />
                <div className="card-body">
                  <h3 className={titlePick.nativeEnglish ? 'notranslate' : undefined}>{titlePick.value}</h3>
                  <p className={excerptPick.nativeEnglish ? 'notranslate' : undefined}>{desc}<span className="more"> …</span></p>
                </div>
                <div className={tagsPick.nativeEnglish ? 'meta tags card-meta notranslate' : 'meta tags card-meta'}>
                  {(tagsPick.value || []).slice(0, 4).map((t) => <span key={t} className="pill">{t}</span>)}
                </div>
              </a>
            )
          })}

          {(!posts || posts.length === 0) && (
            <div className="card" style={{ gridColumn: '1 / span 12' }}>
              <h3 className={lang === 'en' ? 'notranslate' : undefined} style={{ margin: 0 }}>{copy.noPosts}</h3>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
