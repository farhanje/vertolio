import {sanityFetch} from '../../../lib/sanity.client'
import {SITE_SETTINGS_QUERY, PROJECT_BY_SLUG_QUERY} from '../../../lib/sanity.queries'
import {placeholderSiteSettings} from '../../../lib/placeholders'
import {RichText} from '../../../lib/portableText'
import Toc from '../../../components/Toc'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function ProjectPage({ params }) {
  const [settings, project] = await Promise.all([
    sanityFetch(SITE_SETTINGS_QUERY).catch(() => placeholderSiteSettings),
    sanityFetch(PROJECT_BY_SLUG_QUERY, { slug: params.slug }),
  ])

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

  const defaultAcc = settings?.pageAccents?.projectDefault || 'none'
  const accent = project?.accent && project.accent !== 'default' ? project.accent : defaultAcc

  return (
    <main className="container" data-accent={accent}>
      <section className="section tight">
        <div className="grid12">
          <div style={{ gridColumn: '1 / span 8' }}>
            <div className="kicker"><span className="dot" /> {project.organization?.name || 'Project'}</div>
            <h1 className="h1-tight">{project.title}</h1>
            {project.summary && <p className="lead">{project.summary}</p>}
          </div>
          <div style={{ gridColumn: '9 / span 4', paddingTop: 10 }}>
            <div className="meta" style={{ marginTop: 0 }}>
              {project.role && <span className="pill">Role: {project.role}</span>}
              {project.timeline && <span className="pill">Timeline: {project.timeline}</span>}
              {(project.tags || []).slice(0, 6).map((t) => <span key={t} className="pill">{t}</span>)}
            </div>
            <div className="cta-row" style={{ marginTop: 14 }}>
              <a className="btn" href="/work">← Back</a>
            </div>
          </div>
        </div>
      </section>

      <div className="hr" />

      <section className="section">
        <div className="content-grid">
          <div id="content">
            <RichText value={project.body} />
          </div>
          <Toc contentId="content" />
        </div>
      </section>
    </main>
  )
}
