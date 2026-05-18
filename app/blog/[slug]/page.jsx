import {sanity} from '../../../lib/sanity.client'
import {POST_BY_SLUG_QUERY} from '../../../lib/sanity.queries'
import {RichText} from '../../../lib/portableText'

export const revalidate = 60

export default async function BlogPost({ params }) {
  const post = await sanity.fetch(POST_BY_SLUG_QUERY, { slug: params.slug })

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

  return (
    <main className="container">
      <section className="section tight">
        <div className="kicker"><span className="dot" /> Blog post</div>
        <h1>{post.title}</h1>
        {post.excerpt && <p className="lead">{post.excerpt}</p>}
        <div className="meta">
          {post.publishedAt && <span className="pill">{new Date(post.publishedAt).toISOString().slice(0,10)}</span>}
          {(post.tags || []).slice(0, 6).map((t) => <span key={t} className="pill">{t}</span>)}
        </div>
        <div className="cta-row" style={{ marginTop: 16 }}>
          <a className="btn" href="/blog">← Back to Blog</a>
          <a className="btn ghost" href="/studio">Edit in Studio →</a>
        </div>
      </section>

      <div className="hr" />

      <section className="section">
        <RichText value={post.body} />
      </section>
    </main>
  )
}
