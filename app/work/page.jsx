import {sanity} from '../../lib/sanity.client'
import {ORGANIZATIONS_QUERY, WORK_INDEX_QUERY} from '../../lib/sanity.queries'

export const dynamic = 'force-dynamic'

function groupByOrg(items = []) {
  const map = new Map()
  for (const it of items) {
    const org = it.organization?.name || 'Others'
    if (!map.has(org)) map.set(org, [])
    map.get(org).push(it)
  }
  return map
}

export default async function Work() {
  const [orgs, projects] = await Promise.all([
    sanity.fetch(ORGANIZATIONS_QUERY),
    sanity.fetch(WORK_INDEX_QUERY),
  ])

  const grouped = groupByOrg(projects)
  const orgOrder = (orgs || []).map(o => o.name)

  const orderedKeys = [
    ...orgOrder,
    ...Array.from(grouped.keys()).filter(k => !orgOrder.includes(k)),
  ]

  return (
    <main className="container">
      <section className="section tight">
        <div className="kicker"><span className="dot" /> Work</div>
        <h1>Work</h1>
        <p className="lead">Grouped by organization. Edit everything from Sanity Studio.</p>
        <div className="cta-row">
          <a className="btn" href="/studio">Open Studio →</a>
        </div>
      </section>

      <div className="hr" />

      <section className="section">
        {orderedKeys.map((org) => {
          const list = grouped.get(org)
          if (!list || list.length === 0) return null
          return (
            <div key={org} style={{ marginBottom: 28 }}>
              <h2 style={{ margin: '0 0 12px' }}>{org}</h2>
              <div className="grid">
                {list.map((p) => (
                  <a key={p.slug?.current} className="card card-link span-6" href={`/work/${p.slug?.current}`}>
                    <h3>{p.title}</h3>
                    <p>{p.summary || ''}</p>
                    <div className="meta">
                      <span className="pill">{p.organization?.name || 'Org'}</span>
                      {(p.tags || []).slice(0, 3).map((t) => (
                        <span key={t} className="pill">{t}</span>
                      ))}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )
        })}

        {projects?.length === 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>No projects yet</h3>
            <p>Add Organizations and Projects in Studio, then they will appear here.</p>
            <div className="cta-row" style={{ marginTop: 12 }}>
              <a className="btn primary" href="/studio">Go to Studio →</a>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
