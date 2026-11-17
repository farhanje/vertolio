import {notFound} from 'next/navigation'
import BirthdayExperience from '../../components/BirthdayExperience'
import {getBirthdayExperience, isBirthdayReady} from '../../lib/birthday'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata = {
  title: 'For Ema, With Love.',
  robots: {index: false, follow: false, noarchive: true},
}

export default async function DearEmaPage() {
  const experience = await getBirthdayExperience()
  if (!isBirthdayReady(experience) || (experience.active !== true && experience.keepStoryPublic !== true)) notFound()
  return <div className="birthday-standalone"><BirthdayExperience experience={experience} /></div>
}
