import {sanityFetch} from '../../../lib/sanity.client'
import {SITE_SETTINGS_QUERY, POST_BY_SLUG_QUERY} from '../../../lib/sanity.queries'
import {placeholderSiteSettings} from '../../../lib/placeholders'
import {RichText} from '../../../lib/portableText'
import Toc from '../../../components/Toc'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function BlogPost({ params }) {
  const [settings, post] = await Promise.all([
    sanityFetch(SITE_SETTINGS_QUERY).catch(() => placeholderSiteSettings),
    sanityFetch(POST_BY_SLUG_QUERY, { slug: params.slug }),
  ])

  if (!post) {
    return (
      <main className="container">
        <section className="section tight">
          <h1>Not found</h1>
          <p className="lead">Post not found.</p>
          <a className="btn" href="/blog">Back to Blog →</a>
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

  return (
    <main className="container" data-accent={accent}>
      <section className="section tight">
        <div className="grid12">
          <div style={{ gridColumn: '1 / span 8' }}>
            <div className="kicker"><span className="dot" /> Blog</div>
            <h1 className="h1-tight">{post.title}</h1>
            {post.excerpt && <p className="lead">{post.excerpt}</p>}
          </div>
          <div style={{ gridColumn: '9 / span 4', paddingTop: 10 }}>
            <div className="meta" style={{ marginTop: 0 }}>
              {post.publishedAt && <span className="pill">{safeDate(post.publishedAt)}</span>}
              {(post.tags || []).slice(0, 6).map((t) => <span key={t} className="pill">{t}</span>)}
            </div>
            <div className="cta-row" style={{ marginTop: 14 }}>
              <a className="btn" href="/blog">← Back</a>
            </div>
          </div>
        </div>
      </section>

      <div className="hr" />

      <section className="section">
        <div className="content-grid">
          <div className="contentbox" id="content">
            <RichText value={post.body} />
          </div>
          <Toc contentId="content" />
        </div>
      </section>
    </main>
  )
}
