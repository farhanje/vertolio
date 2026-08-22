import {sanityFetch} from '../../../lib/sanity.client'
import {SITE_SETTINGS_QUERY, POST_BY_SLUG_QUERY} from '../../../lib/sanity.queries'
import {placeholderSiteSettings} from '../../../lib/placeholders'
import {RichText} from '../../../lib/portableText'
import Toc from '../../../components/Toc'
import BackSmart from '../../../components/BackSmart'
import Comments from '../../../components/Comments'
import ContentEngagementTracker from '../../../components/ContentEngagementTracker'
import {getLanguage} from '../../../lib/i18n.server'
import {pickLocalized, uiCopy} from '../../../lib/i18n'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function BlogPost({ params }) {
  const lang = getLanguage()
  const copy = uiCopy(lang)

  const [settings, post] = await Promise.all([
    sanityFetch(SITE_SETTINGS_QUERY).catch(() => placeholderSiteSettings),
    sanityFetch(POST_BY_SLUG_QUERY, { slug: params.slug }),
  ])

  if (!post) {
    return (
      <main className="container">
        <section className="section tight">
          <h1 className={lang === 'en' ? 'notranslate' : undefined}>{copy.notFound}</h1>
          <p className={lang === 'en' ? 'lead notranslate' : 'lead'}>{copy.postNotFound}</p>
          <a className={lang === 'en' ? 'btn notranslate' : 'btn'} href="/blog">{copy.backToBlog}</a>
        </section>
      </main>
    )
  }

  const defaultAcc = settings?.pageAccents?.postDefault || 'none'
  const accent = post?.accent && post.accent !== 'default' ? post.accent : defaultAcc

  const safeDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  }

  const titlePick = pickLocalized(post?.title, post?.titleEn, lang)
  const excerptPick = pickLocalized(post?.excerpt, post?.excerptEn, lang)
  const tagsPick = pickLocalized(post?.tags, post?.tagsEn, lang)
  const bodyPick = pickLocalized(post?.body, post?.bodyEn, lang)
  const commentRepo = settings?.seo?.commentsRepo || 'farhanje/vertolio'

  return (
    <main className="container" data-accent={accent}>
      <ContentEngagementTracker contentType="blog" slug={params.slug} contentId="content" />

      <section className="section tight">
        <div className="grid12">
          <div style={{ gridColumn: '1 / span 8' }}>
            <div className="kicker"><span className="dot" /> <span className="notranslate">Farhan Fauzan Jamaludin</span></div>
            <h1 className={titlePick.nativeEnglish ? 'h1-tight notranslate' : 'h1-tight'}>{titlePick.value}</h1>
            {excerptPick.value && <p className={excerptPick.nativeEnglish ? 'lead notranslate' : 'lead'}>{excerptPick.value}</p>}
          </div>
          <div style={{ gridColumn: '9 / span 4', paddingTop: 10 }}>
            <div className="meta" style={{ marginTop: 0 }}>
              {post.publishedAt && <span className="pill notranslate">{safeDate(post.publishedAt)}</span>}
              {(tagsPick.value || []).slice(0, 6).map((t) => <span key={t} className={tagsPick.nativeEnglish ? 'pill notranslate' : 'pill'}>{t}</span>)}
            </div>
            <div className="cta-row" style={{ marginTop: 14 }}>
              <BackSmart fallback="/blog" lang={lang} />
            </div>
          </div>
        </div>
      </section>

      <div className="hr" />

      <section className="section">
        <div className="content-grid">
          <div id="content" className="content-nudge">
            <div className={bodyPick.nativeEnglish ? 'notranslate' : undefined}>
              <RichText value={bodyPick.value} />
            </div>

            <div className="hr" style={{ marginTop: 32 }} />
            <Comments repo={commentRepo} />
          </div>
          <Toc contentId="content" lang={lang} />
        </div>
      </section>
    </main>
  )
}
