import {sanityFetch} from '../../lib/sanity.client'
import {SITE_SETTINGS_QUERY, ORGANIZATIONS_QUERY, WORK_INDEX_QUERY} from '../../lib/sanity.queries'
import {placeholderOrganizations, placeholderProjects, placeholderSiteSettings} from '../../lib/placeholders'
import EditorialCard from '../../components/EditorialCard'
import {urlFor} from '../../lib/sanity.image'
import {getLanguage} from '../../lib/i18n.server'
import {pickLocalized, uiCopy} from '../../lib/i18n'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function sortProjects(items = []) {
  return [...items].sort((a, b) => {
    const aOrder = Number.isFinite(a?.workOrder) ? a.workOrder : Number.POSITIVE_INFINITY
    const bOrder = Number.isFinite(b?.workOrder) ? b.workOrder : Number.POSITIVE_INFINITY
    if (aOrder !== bOrder) return aOrder - bOrder

    const aDate = a?.date ? new Date(a.date).getTime() : 0
    const bDate = b?.date ? new Date(b.date).getTime() : 0
    return bDate - aDate
  })
}

function groupByOrg(items = []) {
  const map = new Map()
  for (const it of items) {
    const org = it.organization?.name || 'Others'
    if (!map.has(org)) map.set(org, [])
    map.get(org).push(it)
  }
  for (const [org, list] of map.entries()) map.set(org, sortProjects(list))
  return map
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function yearOf(date) {
  if (!date) return ''
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? '' : String(d.getFullYear())
}

function cardData(p, lang, index, featured) {
  const titlePick = pickLocalized(p?.title, p?.titleEn, lang)
  const summaryPick = pickLocalized(p?.summary, p?.summaryEn, lang)
  const tagsPick = pickLocalized(p?.tags, p?.tagsEn, lang)
  const altPick = pickLocalized(p?.cardImage?.alt, p?.cardImage?.altEn, lang)
  const statLabelPick = pickLocalized(p?.cardStat?.label, p?.cardStat?.labelEn, lang)
  const typeLabel = featured
    ? (lang === 'en' ? 'FEATURED CASE STUDY' : 'STUDI KASUS UTAMA')
    : (lang === 'en' ? 'CASE STUDY' : 'STUDI KASUS')
  const meta = [...(tagsPick.value || []).slice(0, 2), yearOf(p?.date)].filter(Boolean)

  return {
    title: titlePick.value,
    summary: summaryPick.value,
    image: p?.cardImage,
    alt: altPick.value,
    logo: p?.organization?.logo,
    index: `${String(index).padStart(2, '0')} / ${typeLabel}`,
    eyebrow: p?.organization?.name,
    meta,
    statValue: p?.cardStat?.value,
    statLabel: statLabelPick.value,
    featured,
    titleClassName: titlePick.nativeEnglish ? 'notranslate' : '',
    summaryClassName: summaryPick.nativeEnglish ? 'notranslate' : '',
  }
}

export default async function Work() {
  const lang = getLanguage()
  const copy = uiCopy(lang)

  let settings = null
  let orgs = []
  let projects = []

  try {
    ;[settings, orgs, projects] = await Promise.all([
      sanityFetch(SITE_SETTINGS_QUERY),
      sanityFetch(ORGANIZATIONS_QUERY),
      sanityFetch(WORK_INDEX_QUERY),
    ])
  } catch (_) {
    settings = placeholderSiteSettings
    orgs = placeholderOrganizations
    projects = placeholderProjects
  }

  const accent = settings?.pageAccents?.work || 'none'
  const grouped = groupByOrg(projects)
  const orgOrder = (orgs || []).map((o) => o.name)

  const orderedKeys = [
    ...orgOrder,
    ...Array.from(grouped.keys()).filter((k) => !orgOrder.includes(k)),
  ]

  // Keep AstraPay first and selected by default regardless of Sanity organization ordering.
  const astraPayKey = orderedKeys.find((name) => String(name).toLowerCase() === 'astrapay')
  const prioritizedKeys = astraPayKey
    ? [astraPayKey, ...orderedKeys.filter((name) => name !== astraPayKey)]
    : orderedKeys

  const groups = prioritizedKeys
    .map((name) => {
      const o = (orgs || []).find((x) => x.name === name)
      const logoBuilder = o?.logo ? urlFor(o.logo) : null
      const logoUrl = logoBuilder ? logoBuilder.width(64).height(64).fit('max').quality(85).auto('format').url() : null
      const id = slugify(name)
      return {key: name, id, logoUrl}
    })
    .filter((g) => grouped.get(g.key)?.length)

  const defaultGroupId = groups.find((g) => String(g.key).toLowerCase() === 'astrapay')?.id || groups[0]?.id

  const tabCss = (groups || [])
    .map((g) => {
      const tab = `#tab-${g.id}:checked ~ .work-tabs .tabs-row label[for="tab-${g.id}"]`
      const panel = `#tab-${g.id}:checked ~ .work-panels .work-panel[data-panel="${g.id}"]`
      return `${tab}{color:var(--fg);border-bottom-color:var(--fg);opacity:1}\n${panel}{display:block}`
    })
    .join('\n')

  return (
    <main className="container page-work" data-accent={accent}>
      <section className="section tight work-hero">
        <div className="grid12">
          <div className="work-hero-title">
            <div className="kicker"><span className="dot" /> <span className="notranslate">Farhan Fauzan Jamaludin</span></div>
            <h1 className={lang === 'en' ? 'h1-tight notranslate' : 'h1-tight'}>{copy.nav.work}</h1>
          </div>
          <div className="work-hero-intro">
            <p className={lang === 'en' ? 'lead notranslate' : 'lead'}>{copy.workIntro}</p>
          </div>
        </div>
      </section>

      <div className="hr" />

      <section className="section work-index-section">
        <div className="work-tabs-wrap" role="tablist" aria-label="Organizations">
          <style>{tabCss}</style>

          {groups.map((g) => (
            <input
              key={g.id}
              className="work-tab-radio"
              type="radio"
              name="orgtab"
              id={`tab-${g.id}`}
              defaultChecked={g.id === defaultGroupId}
            />
          ))}

          <div className="work-tabs">
            <div className="tabs-row">
              {groups.map((g) => (
                <label key={g.id} className="tab" htmlFor={`tab-${g.id}`}>
                  {g.logoUrl ? <img className="tab-logo" src={g.logoUrl} alt="" aria-hidden="true" /> : <span className="tab-mark" aria-hidden="true" />}
                  <span className="tab-text notranslate">{g.key}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="work-panels">
            {groups.map((g) => {
              const list = grouped.get(g.key) || []
              const [featured, ...supporting] = list

              return (
                <div key={g.id} className="work-panel" data-panel={g.id}>
                  {featured?.slug?.current ? (
                    <EditorialCard
                      href={`/work/${featured.slug.current}`}
                      className="work-featured-card"
                      {...cardData(featured, lang, 1, true)}
                    />
                  ) : null}

                  {supporting.length ? (
                    <div className="grid12 editorial-support-grid">
                      {supporting.map((p, idx) => p?.slug?.current ? (
                        <EditorialCard
                          key={p.slug.current}
                          href={`/work/${p.slug.current}`}
                          className="work-support-card"
                          {...cardData(p, lang, idx + 2, false)}
                        />
                      ) : null)}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
