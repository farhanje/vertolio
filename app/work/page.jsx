import {sanityFetch} from '../../lib/sanity.client'
import {ORGANIZATIONS_QUERY, WORK_INDEX_QUERY} from '../../lib/sanity.queries'
import {placeholderOrganizations, placeholderProjects} from '../../lib/placeholders'
import CardMedia from '../../components/CardMedia'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

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
  let orgs = []
  let projects = []

  try {
    ;[orgs, projects] = await Promise.all([
      sanityFetch(ORGANIZATIONS_QUERY),
      sanityFetch(WORK_INDEX_QUERY),
    ])
  } catch (_) {
    orgs = placeholderOrganizations
    projects = placeholderProjects
  }

  const grouped = groupByOrg(projects)
  const orgOrder = (orgs || []).map((o) => o.name)

  const orderedKeys = [
    ...orgOrder,
    ...Array.from(grouped.keys()).filter((k) => !orgOrder.includes(k)),
  ]

  return (
    <main className="container page-work">
      <section className="section tight">
        <div className="grid12">
          <div style={{ gridColumn: '1 / span 8' }}>
            <div className="kicker"><span className="dot" /> Work</div>
            <h1 className="h1-tight">Work</h1>
          </div>
          <div style={{ gridColumn: '9 / span 4', paddingTop: 10 }}>
            <p className="lead">Selected case studies and experiments.</p>
          </div>
        </div>
      </section>

      <div className="hr" />

      <section className="section">
        {orderedKeys.map((org) => {
          const list = grouped.get(org)
          if (!list || list.length === 0) return null
          return (
            <div key={org} style={{ marginBottom: 40 }}>
              <div className="grid12" style={{ marginBottom: 12 }}>
                <div style={{ gridColumn: '1 / span 4' }}>
                  <h2>{org}</h2>
                </div>
                <div style={{ gridColumn: '5 / span 8' }} className="hr" />
              </div>

              <div className="grid12 work-grid">
                {list.map((p) => (
                  <a
                    key={p.slug?.current}
                    className="card card-link"
                    style={{ gridColumn: 'span 6' }}
                    href={`/work/${p.slug?.current}`}
                  >
                    <CardMedia image={p.cardImage} alt={p.cardImage?.alt} logo={p.organization?.logo} />
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
      </section>
    </main>
  )
}
