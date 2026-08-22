import {notFound} from 'next/navigation'
import {sanityFetch} from '../../../lib/sanity.client'
import {RECRUITER_LINK_BY_CODE_QUERY} from '../../../lib/sanity.queries'
import {getLanguage} from '../../../lib/i18n.server'
import {pickLocalized} from '../../../lib/i18n'
import CardMedia from '../../../components/CardMedia'
import MarqueeText from '../../../components/MarqueeText'
import {RecruiterOpenTracker, RecruiterTrackedLink} from '../../../components/RecruiterTracking'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function trunc(input, max = 280) {
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
  const adjusted = (extra > 0 && visible.length % 2 === 1)
    ? visible.slice(0, Math.max(0, visible.length - 1))
    : visible
  return {visible: adjusted, extra: Math.max(0, tags.length - adjusted.length)}
}

async function getRecruiterLink(code) {
  const cleanCode = String(code || '').trim().toLowerCase()
  if (!cleanCode) return null
  try {
    return await sanityFetch(RECRUITER_LINK_BY_CODE_QUERY, {code: cleanCode})
  } catch (_) {
    return null
  }
}

export async function generateMetadata({params}) {
  const recruiter = await getRecruiterLink(params?.code)
  if (!recruiter) {
    return {
      title: 'Selected work',
      robots: {index: false, follow: false},
    }
  }

  const title = recruiter?.role
    ? `${recruiter.company} · ${recruiter.role} · Selected work`
    : `${recruiter.company} · Selected work`

  return {
    title,
    description: 'A curated selection of product design work by Farhan Fauzan Jamaludin.',
    robots: {index: false, follow: false, noarchive: true},
  }
}

export default async function RecruiterPortfolio({params}) {
  const recruiter = await getRecruiterLink(params?.code)
  if (!recruiter) notFound()

  const lang = getLanguage()
  const code = recruiter?.linkCode?.current || String(params?.code || '')
  const company = recruiter?.company || 'this opportunity'
  const role = recruiter?.role || ''
  const projects = recruiter?.selectedProjects || []

  const defaultMessageEn = 'A few projects selected for this opportunity, focused on complex product systems, clear decision-making, and measurable outcomes.'
  const defaultMessageId = 'Beberapa proyek yang saya pilih untuk kesempatan ini, dengan fokus pada sistem produk yang kompleks, keputusan desain yang jelas, dan hasil yang terukur.'
  const messagePick = pickLocalized(recruiter?.message, recruiter?.messageEn, lang)
  const message = messagePick.value || (lang === 'en' ? defaultMessageEn : defaultMessageId)

  const selectedLabel = lang === 'en' ? 'Selected for' : 'Dipilih untuk'
  const curatedLabel = lang === 'en' ? 'Curated portfolio' : 'Portofolio pilihan'
  const resumeLabel = lang === 'en' ? 'View resume' : 'Lihat resume'
  const allWorkLabel = lang === 'en' ? 'View all work' : 'Lihat semua karya'
  const projectsLabel = lang === 'en' ? 'Selected work' : 'Karya pilihan'
  const projectCountLabel = lang === 'en'
    ? (projects.length === 1 ? 'project' : 'projects')
    : 'proyek'

  return (
    <main className="container page-work recruiter-page" data-accent="none">
      <RecruiterOpenTracker code={code} company={company} role={role} />

      <section className="section tight recruiter-hero">
        <div className="grid12">
          <div style={{gridColumn: '1 / span 7'}}>
            <div className={lang === 'en' ? 'kicker notranslate' : 'kicker'}>
              <span className="dot" /> {curatedLabel}
            </div>
            <h1 className={lang === 'en' ? 'h1-tight notranslate' : 'h1-tight'}>
              {selectedLabel} {company}
            </h1>
            {role ? <div className="recruiter-role notranslate">{role}</div> : null}
          </div>

          <div style={{gridColumn: '8 / span 5', paddingTop: 10}}>
            <p className={messagePick.nativeEnglish || (lang === 'en' && !recruiter?.messageEn) ? 'lead notranslate' : 'lead'}>
              {message}
            </p>

            {(recruiter?.showResume !== false || recruiter?.showAllWork !== false) ? (
              <div className="cta-row recruiter-cta" style={{marginTop: 16}}>
                {recruiter?.showResume !== false ? (
                  <RecruiterTrackedLink
                    href="/resume"
                    className="btn primary"
                    eventName="recruiter_resume_open"
                    code={code}
                    company={company}
                    target="resume"
                  >
                    {resumeLabel}
                  </RecruiterTrackedLink>
                ) : null}

                {recruiter?.showAllWork !== false ? (
                  <RecruiterTrackedLink
                    href="/work"
                    className="btn"
                    eventName="recruiter_all_work_open"
                    code={code}
                    company={company}
                    target="all-work"
                  >
                    {allWorkLabel}
                  </RecruiterTrackedLink>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="hr" />

      <section className="section">
        <div className="recruiter-section-head">
          <div className={lang === 'en' ? 'kicker notranslate' : 'kicker'}><span className="dot" /> {projectsLabel}</div>
          <div className="recruiter-count">{projects.length} {projectCountLabel}</div>
        </div>

        <div className="grid12 work-grid" style={{alignItems: 'stretch'}}>
          {projects.map((p) => {
            const titlePick = pickLocalized(p?.title, p?.titleEn, lang)
            const summaryPick = pickLocalized(p?.summary, p?.summaryEn, lang)
            const tagsPick = pickLocalized(p?.tags, p?.tagsEn, lang)
            const altPick = pickLocalized(p?.cardImage?.alt, p?.cardImage?.altEn, lang)
            const tags = [p?.organization?.name, ...(tagsPick.value || [])].filter(Boolean)
            const {visible, extra} = buildTagSet(tags, 4)
            const desc = trunc(summaryPick.value || '', 300)
            const slug = p?.slug?.current
            if (!slug) return null

            return (
              <RecruiterTrackedLink
                key={p?._id || slug}
                className="card card-link"
                style={{gridColumn: 'span 6'}}
                href={`/work/${slug}?r=${encodeURIComponent(code)}`}
                eventName="recruiter_project_open"
                code={code}
                company={company}
                target={slug}
              >
                <CardMedia image={p.cardImage} alt={altPick.value} logo={p.organization?.logo} />
                <div className="card-body">
                  <h3 className={titlePick.nativeEnglish ? 'notranslate' : undefined}>{titlePick.value}</h3>
                  {desc ? <p className={summaryPick.nativeEnglish ? 'notranslate' : undefined}>{desc}</p> : null}
                </div>
                <div className={tagsPick.nativeEnglish ? 'meta tags card-meta notranslate' : 'meta tags card-meta'}>
                  {visible.map((t) => <TagPill key={t} text={t} />)}
                  {extra ? <span className="pill morepill">+{extra}</span> : null}
                </div>
              </RecruiterTrackedLink>
            )
          })}
        </div>
      </section>
    </main>
  )
}
