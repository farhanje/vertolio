import {notFound} from 'next/navigation'
import {sanityFetch} from '../../../lib/sanity.client'
import {RECRUITER_LINK_BY_CODE_QUERY} from '../../../lib/sanity.queries'
import {getLanguage} from '../../../lib/i18n.server'
import {pickLocalized} from '../../../lib/i18n'
import {EditorialCardContent} from '../../../components/EditorialCard'
import {RecruiterOpenTracker, RecruiterTrackedLink} from '../../../components/RecruiterTracking'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function yearOf(date) {
  if (!date) return ''
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? '' : String(d.getFullYear())
}

function projectCardData(p, lang, index, featured = false) {
  const titlePick = pickLocalized(p?.title, p?.titleEn, lang)
  const summaryPick = pickLocalized(p?.summary, p?.summaryEn, lang)
  const tagsPick = pickLocalized(p?.tags, p?.tagsEn, lang)
  const altPick = pickLocalized(p?.cardImage?.alt, p?.cardImage?.altEn, lang)
  const statLabelPick = pickLocalized(p?.cardStat?.label, p?.cardStat?.labelEn, lang)
  const typeLabel = featured
    ? (lang === 'en' ? 'SELECTED CASE STUDY' : 'STUDI KASUS PILIHAN')
    : (lang === 'en' ? 'CASE STUDY' : 'STUDI KASUS')

  return {
    title: titlePick.value,
    summary: summaryPick.value,
    image: p?.cardImage,
    alt: altPick.value,
    logo: p?.organization?.logo,
    index: `${String(index).padStart(2, '0')} / ${typeLabel}`,
    eyebrow: p?.organization?.name,
    meta: [...(tagsPick.value || []).slice(0, 2), yearOf(p?.date)].filter(Boolean),
    statValue: p?.cardStat?.value,
    statLabel: statLabelPick.value,
    featured,
    titleClassName: titlePick.nativeEnglish ? 'notranslate' : '',
    summaryClassName: summaryPick.nativeEnglish ? 'notranslate' : '',
  }
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
  // Preserve the exact drag-and-drop order from the Recruiter Link document.
  const projects = recruiter?.selectedProjects || []
  const [featuredProject, ...supportingProjects] = projects

  const defaultMessageEn = 'A few projects selected for this opportunity, focused on complex product systems, clear decision-making, and measurable outcomes.'
  const defaultMessageId = 'Beberapa proyek yang saya pilih untuk kesempatan ini, dengan fokus pada sistem produk yang kompleks, keputusan desain yang jelas, dan hasil yang terukur.'
  const messagePick = pickLocalized(recruiter?.message, recruiter?.messageEn, lang)
  const message = messagePick.value || (lang === 'en' ? defaultMessageEn : defaultMessageId)

  const selectedLabel = lang === 'en' ? 'Selected for' : 'Dipilih untuk'
  const curatedLabel = lang === 'en' ? 'Curated portfolio' : 'Portofolio pilihan'
  const resumeLabel = lang === 'en' ? 'View resume' : 'Lihat resume'
  const allWorkLabel = lang === 'en' ? 'View all work' : 'Lihat semua karya'
  const projectsLabel = lang === 'en' ? 'Selected work' : 'Karya pilihan'
  const projectCountLabel = lang === 'en' ? (projects.length === 1 ? 'project' : 'projects') : 'proyek'

  const trackedProject = (p, idx, featured) => {
    const slug = p?.slug?.current
    if (!slug) return null
    const classes = [
      'editorial-card',
      'card-link',
      featured ? 'editorial-card-featured recruiter-featured-card' : 'editorial-card-standard recruiter-support-card',
    ].join(' ')

    return (
      <RecruiterTrackedLink
        key={p?._id || slug}
        className={classes}
        href={`/work/${slug}?r=${encodeURIComponent(code)}`}
        eventName="recruiter_project_open"
        code={code}
        company={company}
        target={slug}
      >
        <EditorialCardContent {...projectCardData(p, lang, idx, featured)} />
      </RecruiterTrackedLink>
    )
  }

  return (
    <main className="container page-work recruiter-page" data-accent="none">
      <RecruiterOpenTracker code={code} company={company} role={role} />

      <section className="section tight recruiter-hero">
        <div className="grid12">
          <div className="recruiter-hero-title">
            <div className={lang === 'en' ? 'kicker notranslate' : 'kicker'}>
              <span className="dot" /> {curatedLabel}
            </div>
            <h1 className={lang === 'en' ? 'h1-tight notranslate' : 'h1-tight'}>
              {selectedLabel} {company}
            </h1>
            {role ? <div className="recruiter-role notranslate">{role}</div> : null}
          </div>

          <div className="recruiter-hero-copy">
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

      <section className="section recruiter-work-section">
        <div className="recruiter-section-head">
          <div className={lang === 'en' ? 'kicker notranslate' : 'kicker'}><span className="dot" /> {projectsLabel}</div>
          <div className="recruiter-count">{projects.length} {projectCountLabel}</div>
        </div>

        {featuredProject ? trackedProject(featuredProject, 1, true) : null}

        {supportingProjects.length ? (
          <div className="grid12 editorial-support-grid recruiter-support-grid">
            {supportingProjects.map((p, idx) => trackedProject(p, idx + 2, false))}
          </div>
        ) : null}
      </section>
    </main>
  )
}
