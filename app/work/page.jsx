import {sanityFetch} from '../../lib/sanity.client'
import {SITE_SETTINGS_QUERY, ORGANIZATIONS_QUERY, WORK_INDEX_QUERY} from '../../lib/sanity.queries'
import {placeholderOrganizations, placeholderProjects, placeholderSiteSettings} from '../../lib/placeholders'
import CardMedia from '../../components/CardMedia'
import MarqueeText from '../../components/MarqueeText'
import {urlFor} from '../../lib/sanity.image'
import {getLanguage} from '../../lib/i18n.server'
import {pickLocalized, uiCopy} from '../../lib/i18n'

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

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function trunc(input, max = 300) {
  const s = String(input || '').trim().replace(/\s+/g, ' ')
  if (!s) return ''
  if (s.length <= max) return s
  return s.slice(0, Math.max(0, max - 1)).trimEnd() + '…'
}

function TagPill({text}) {
  return (
    <span className="pill">
      <MarqueeText text={text} />
    </span>
  )
}

function buildTagSet(tags = [], cap = 4) {
  const visible = tags.slice(0, cap)
  const extra = Math.max(0, tags.length - visible.length)
  const v = (extra > 0 && visible.length % 2 === 1) ? visible.slice(0, Math.max(0, visible.length - 1)) : visible
  const e = Math.max(0, tags.length - v.length)
  return { visible: v, extra: e }
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
      return { key: name, id, logoUrl }
    })
    .filter((g) => grouped.get(g.key)?.length)

  const defaultGroupId = groups.find((g) => String(g.key).toLowerCase() === 'astrapay')?.id || groups[0]?.id

  const tabCss = (groups || [])
    .map((g) => {
      const tab = `#tab-${g.id}:checked ~ .work-tabs .tabs-row label[for="tab-${g.id}"]`
      const panel = `#tab-${g.id}:checked ~ .work-panels .work-panel[data-panel="${g.id}"]`
      return `${tab}{color:var(--fg);border-color:rgba(11,11,11,.32)}\n${panel}{display:block}`
    })
    .join('\n')

  return (
    <main className="container page-work" data-accent={accent}>
      <section className="section tight">
        <div className="grid12">
          <div style={{ gridColumn: '1 / span 8' }}>
            <div className="kicker"><span className="dot" /> <span className="notranslate">Farhan Fauzan Jamaludin</span></div>
            <h1 className={lang === 'en' ? 'h1-tight notranslate' : 'h1-tight'}>{copy.nav.work}</h1>
          </div>
          <div style={{ gridColumn: '9 / span 4', paddingTop: 10 }}>
            <p className={lang === 'en' ? 'lead notranslate' : 'lead'}>{copy.workIntro}</p>
          </div>
        </div>
      </section>

      <div className="hr" />

      <section className="section">
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
                  {g.logoUrl ? (
                    <img className="tab-logo" src={g.logoUrl} alt="" aria-hidden="true" />
                  ) : (
                    <span className="tab-mark" aria-hidden="true" />
                  )}
                  <span className="tab-text notranslate">{g.key}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="work-panels">
            {groups.map((g) => {
              const list = grouped.get(g.key) || []
              return (
                <div key={g.id} className="work-panel" data-panel={g.id}>
                  <div className="grid12 work-grid" style={{ alignItems: 'stretch' }}>
                    {list.map((p) => {
                      const titlePick = pickLocalized(p?.title, p?.titleEn, lang)
                      const summaryPick = pickLocalized(p?.summary, p?.summaryEn, lang)
                      const tagsPick = pickLocalized(p?.tags, p?.tagsEn, lang)
                      const altPick = pickLocalized(p?.cardImage?.alt, p?.cardImage?.altEn, lang)
                      const tags = [p.organization?.name, ...(tagsPick.value || [])].filter(Boolean)
                      const { visible, extra } = buildTagSet(tags, 4)
                      const desc = trunc(summaryPick.value || '', 320)

                      return (
                        <a
                          key={p.slug?.current}
                          className="card card-link"
                          style={{ gridColumn: 'span 6' }}
                          href={`/work/${p.slug?.current}`}
                        >
                          <CardMedia image={p.cardImage} alt={altPick.value} logo={p.organization?.logo} />
                          <div className="card-body">
                            <h3 className={titlePick.nativeEnglish ? 'notranslate' : undefined}>{titlePick.value}</h3>
                            <p className={summaryPick.nativeEnglish ? 'notranslate' : undefined}>{desc}<span className="more"> …</span></p>
                          </div>
                          <div className={tagsPick.nativeEnglish ? 'meta tags card-meta notranslate' : 'meta tags card-meta'}>
                            {visible.map((t) => <TagPill key={t} text={t} />)}
                            {extra ? <span className="pill morepill">+{extra}</span> : null}
                          </div>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
