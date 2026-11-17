import {sanityFetch} from './sanity.client'
import {BIRTHDAY_EXPERIENCE_QUERY} from './sanity.queries'

export async function getBirthdayExperience() {
  try {
    return await sanityFetch(BIRTHDAY_EXPERIENCE_QUERY)
  } catch (_) {
    // Fail closed: a Sanity outage must never replace the real portfolio.
    return null
  }
}

export function isBirthdayReady(experience) {
  if (!experience?.heroImage?.asset?.url) return false
  return (experience.chapters || []).some((chapter) => {
    if (chapter?._type === 'birthdayStoryChapter') return (chapter.body || []).length > 0
    if (chapter?._type === 'birthdayPhotoCollage') return (chapter.photos || []).some((p) => p?.asset?.url)
    if (chapter?._type === 'birthdayQuote') return Boolean(chapter.quote?.trim())
    return false
  })
}

export function isBirthdayTakeoverActive(experience) {
  return experience?.active === true && isBirthdayReady(experience)
}
