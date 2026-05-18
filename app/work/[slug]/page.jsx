import {sanity} from '../../../lib/sanity.client'
import {PROJECT_BY_SLUG_QUERY} from '../../../lib/sanity.queries'
import {RichText} from '../../../lib/portableText'

export const dynamic = 'force-dynamic'

export default async function ProjectPage({ params }) {
  const project = await sanity.fetch(PROJECT_BY_SLUG_QUERY, { slug: params.slug })

  if (!project) {
    return (
      <main className="container">
        <section className="section tight">
          <h1>Not found</h1>
          <p className="lead">Project not found.</p>
          <a className="btn" href="/work">Back to Work →</a>
        </section>
      </main>
    )
  }

  return (
    <main className="container">
      <section className="section tight">
        <div className="kicker"><span className="dot" /> {project.organization?.name || 'Project'}</div>
        <h1>{project.title}</h1>
        {project.summary && <p className="lead">{project.summary}</p>}

        <div className="meta">
          {project.role && <span className="pill">Role: {project.role}</span>}
          {project.timeline && <span className="pill">Timeline: {project.timeline}</span>}
          {(project.tags || []).slice(0, 6).map((t) => <span key={t} className="pill">{t}</span>)}
        </div>

        <div className="cta-row" style={{ marginTop: 16 }}>
          <a className="btn" href="/work">← Back to Work</a>
          <a className="btn ghost" href="/studio">Edit in Studio →</a>
        </div>
      </section>

      <div className="hr" />

      <section className="section">
        <RichText value={project.body} />
      </section>
    </main>
  )
}
