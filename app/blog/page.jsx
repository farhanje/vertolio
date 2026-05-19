import {sanityFetch} from '../../lib/sanity.client'
import {SITE_SETTINGS_QUERY, BLOG_INDEX_QUERY} from '../../lib/sanity.queries'
import {placeholderSiteSettings} from '../../lib/placeholders'
import CardMedia from '../../components/CardMedia'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function safeDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export default async function BlogIndex() {
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
            <div className="kicker"><span className="dot" /> Blog</div>
            <h1 className="h1-tight">Blog</h1>
          </div>
          <div style={{ gridColumn: '9 / span 4', paddingTop: 10 }}>
            <p className="lead">Notes, write-ups, and small experiments.</p>
          </div>
        </div>
      </section>

      <div className="hr" />

      <section className="section blog-list">
        <div className="grid12">
          {(posts || []).map((p) => {
            const slug = p?.slug?.current
            if (!slug) return null
            const date = safeDate(p.publishedAt)
            return (
              <a
                key={slug}
                className="card card-link"
                style={{ gridColumn: '1 / span 12' }}
                href={`/blog/${slug}`}
              >
                <div className="grid12" style={{ gap: 12 }}>
                  <div style={{ gridColumn: '1 / span 2' }} className="small">{date}</div>
                  <div style={{ gridColumn: '3 / span 10' }}>
                    <CardMedia image={p.cardImage} alt={p.cardImage?.alt} />
                    <h3>{p.title}</h3>
                    <p>
                      {p.excerpt || ''}
                      <span className="more">→ click more</span>
                    </p>
                    <div className="meta">
                      {(p.tags || []).slice(0, 4).map((t) => <span key={t} className="pill">{t}</span>)}
                    </div>
                  </div>
                </div>
              </a>
            )
          })}

          {(!posts || posts.length === 0) && (
            <div className="card" style={{ gridColumn: '1 / span 12' }}>
              <h3 style={{ margin: 0 }}>No posts yet</h3>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
