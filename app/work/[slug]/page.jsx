import {sanityFetch} from '../../../lib/sanity.client'
import {SITE_SETTINGS_QUERY, PROJECT_BY_SLUG_QUERY} from '../../../lib/sanity.queries'
import {placeholderSiteSettings} from '../../../lib/placeholders'
import {RichText} from '../../../lib/portableText'
import Toc from '../../../components/Toc'
import BackSmart from '../../../components/BackSmart'
import ContentEngagementTracker from '../../../components/ContentEngagementTracker'
import {getLanguage} from '../../../lib/i18n.server'
import {pickLocalized, uiCopy} from '../../../lib/i18n'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function ProjectPage({ params }) {
  const lang = getLanguage()
  const copy = uiCopy(lang)

  const [settings, project] = await Promise.all([
    sanityFetch(SITE_SETTINGS_QUERY).catch(() => placeholderSiteSettings),
    sanityFetch(PROJECT_BY_SLUG_QUERY, { slug: params.slug }),
  ])

  if (!project) {
    return (
      <main className="container">
        <section className="section tight">
          <h1 className={lang === 'en' ? 'notranslate' : undefined}>{copy.notFound}</h1>
          <p className={lang === 'en' ? 'lead notranslate' : 'lead'}>{copy.projectNotFound}</p>
          <a className={lang === 'en' ? 'btn notranslate' : 'btn'} href="/work">{copy.backToWork}</a>
        </section>
      </main>
    )
  }

  const defaultAcc = settings?.pageAccents?.projectDefault || 'none'
  const accent = project?.accent && project.accent !== 'default' ? project.accent : defaultAcc

  const titlePick = pickLocalized(project?.title, project?.titleEn, lang)
  const summaryPick = pickLocalized(project?.summary, project?.summaryEn, lang)
  const rolePick = pickLocalized(project?.role, project?.roleEn, lang)
  const timelinePick = pickLocalized(project?.timeline, project?.timelineEn, lang)
  const tagsPick = pickLocalized(project?.tags, project?.tagsEn, lang)
  const bodyPick = pickLocalized(project?.body, project?.bodyEn, lang)

  return (
    <main className="container" data-accent={accent}>
      <ContentEngagementTracker contentType="project" slug={params.slug} contentId="content" />

      <section className="section tight">
        <div className="grid12">
          <div style={{ gridColumn: '1 / span 8' }}>
            <div className="kicker"><span className="dot" /> <span className="notranslate">{project.organization?.name || 'Project'}</span></div>
            <h1 className={titlePick.nativeEnglish ? 'h1-tight notranslate' : 'h1-tight'}>{titlePick.value}</h1>
            {summaryPick.value && <p className={summaryPick.nativeEnglish ? 'lead notranslate' : 'lead'}>{summaryPick.value}</p>}
          </div>
          <div style={{ gridColumn: '9 / span 4', paddingTop: 10 }}>
            <div className="meta" style={{ marginTop: 0 }}>
              {rolePick.value && (
                <span className={rolePick.nativeEnglish ? 'pill notranslate' : 'pill'}>
                  {copy.role}: {rolePick.value}
                </span>
              )}
              {timelinePick.value && (
                <span className={timelinePick.nativeEnglish ? 'pill notranslate' : 'pill'}>
                  {copy.timeline}: {timelinePick.value}
                </span>
              )}
              {(tagsPick.value || []).slice(0, 6).map((t) => (
                <span key={t} className={tagsPick.nativeEnglish ? 'pill notranslate' : 'pill'}>{t}</span>
              ))}
            </div>
            <div className="cta-row" style={{ marginTop: 14 }}>
              <BackSmart fallback="/work" lang={lang} />
            </div>
          </div>
        </div>
      </section>

      <div className="hr" />

      <section className="section">
        <div className="content-grid">
          <div id="content" className={bodyPick.nativeEnglish ? 'content-nudge notranslate' : 'content-nudge'}>
            <RichText value={bodyPick.value} />
          </div>
          <Toc contentId="content" lang={lang} />
        </div>
      </section>
    </main>
  )
}
