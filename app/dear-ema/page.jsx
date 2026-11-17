import BirthdayExperience from '../../components/BirthdayExperience'
import BirthdayTakeover from '../../components/BirthdayTakeover'
import {PortfolioHome} from '../page'
import {getBirthdayDraftPreview} from '../../lib/birthday.preview.server'
import {isBirthdayReady} from '../../lib/birthday'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata = {
  title: 'Private Preview | For Ema, With Love.',
  robots: {index: false, follow: false, noarchive: true, nosnippet: true},
}

export default async function DearEmaPage({searchParams}) {
  const {experience, error} = await getBirthdayDraftPreview()
  const showIntro = searchParams?.intro === '1'
  const ready = isBirthdayReady(experience)

  return (
    <div className={showIntro ? "birthday-standalone birthday-standalone--intro" : "birthday-standalone"}>
      <nav className="birthday-preview-toolbar notranslate" aria-label="Private birthday preview controls">
        <div className="birthday-preview-label">
          <strong>PRIVATE PREVIEW</strong>
          <span>{experience?.active === true ? 'Homepage ON in draft' : 'Homepage OFF'} · {ready ? 'Story ready' : 'Work in progress'}</span>
        </div>
        <div className="birthday-preview-actions">
          <a href="/studio" target="_blank" rel="noopener noreferrer">Edit in Sanity ↗</a>
          <a href={showIntro ? '/dear-ema' : '/dear-ema?intro=1'}>{showIntro ? 'View story' : 'Replay opening'}</a>
          <a href={showIntro ? '/dear-ema?intro=1' : '/dear-ema'}>Refresh draft</a>
        </div>
      </nav>
      {experience ? (
        showIntro ? (
          <BirthdayTakeover
            portfolio={<PortfolioHome />}
            birthday={<BirthdayExperience experience={experience} preview />}
            introLines={experience.introLines}
          />
        ) : (
          <BirthdayExperience experience={experience} />
        )
      ) : (
        <main className="birthday-preview-empty">
          <div className="birthday-eyebrow">FOR EMA, WITH LOVE.</div>
          <h1>Birthday story preview</h1>
          <p>{error || 'Start adding your story in Sanity, then refresh this page.'}</p>
        </main>
      )}
    </div>
  )
}
