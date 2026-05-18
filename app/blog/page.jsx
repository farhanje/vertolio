import {sanity} from '../../lib/sanity.client'
import {BLOG_INDEX_QUERY} from '../../lib/sanity.queries'

export const dynamic = 'force-dynamic'

export default async function BlogIndex() {
  const posts = await sanity.fetch(BLOG_INDEX_QUERY)

  return (
    <main className="container">
      <section className="section tight">
        <div className="kicker"><span className="dot" /> Blog</div>
        <h1>Blog</h1>
        <p className="lead">Short notes on UX, experiments, and product thinking.</p>
        <div className="cta-row">
          <a className="btn" href="/studio">Write in Studio →</a>
        </div>
      </section>

      <div className="hr" />

      <section className="section">
        <div className="grid">
          {(posts || []).map((p) => (
            <a key={p.slug?.current} className="card card-link span-12" href={`/blog/${p.slug?.current}`}>
              <h3>{p.title}</h3>
              <p>{p.excerpt || ''}</p>
              <div className="meta">
                {p.publishedAt && <span className="pill">{new Date(p.publishedAt).toISOString().slice(0,10)}</span>}
                {(p.tags || []).slice(0, 4).map((t) => <span key={t} className="pill">{t}</span>)}
              </div>
            </a>
          ))}

          {(!posts || posts.length === 0) && (
            <div className="card span-12">
              <h3 style={{ marginTop: 0 }}>No posts yet</h3>
              <p>Create your first post in Studio, then it will appear here.</p>
              <div className="cta-row" style={{ marginTop: 12 }}>
                <a className="btn primary" href="/studio">Go to Studio →</a>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
