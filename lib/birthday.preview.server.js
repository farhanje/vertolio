import {createClient} from '@sanity/client'
import {BIRTHDAY_EXPERIENCE_QUERY} from './sanity.queries'
import {sanityFetch} from './sanity.client'

// This file is imported only by the Basic-Auth-protected /dear-ema Server Component.
// Its token must never be passed to the browser or surfaced in a response.
const DRAFT_QUERY = BIRTHDAY_EXPERIENCE_QUERY.replace(
  '*[_type=="birthdayExperience" && _id=="birthday-experience"][0]',
  '*[_type=="birthdayExperience" && _id in ["drafts.birthday-experience", "birthday-experience"]] | order(_id desc)[0]',
)

export async function getBirthdayDraftPreview() {
  const token = process.env.SANITY_PREVIEW_READ_TOKEN ||
    process.env.SANITY_READ_TOKEN ||
    process.env.SANITY_API_READ_TOKEN ||
    process.env.SANITY_WRITE_TOKEN

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'iq6vjwu7'
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
  let reason = ''

  if (token) {
    try {
      // This repository pins @sanity/client 6.21.2. The newer "drafts"
      // perspective requires a newer SDK. Query the old, well-supported
      // "raw" perspective and prioritize the drafts.* document explicitly.
      const client = createClient({
        projectId,
        dataset,
        apiVersion: '2025-01-01',
        useCdn: false,
        token,
        perspective: 'raw',
      })
      const experience = await client.fetch(DRAFT_QUERY, {}, {
        cache: 'no-store',
        perspective: 'raw',
      })
      if (experience) return {experience, source: 'draft', error: null}
      reason = 'empty'
    } catch (error) {
      const status = Number(error?.statusCode || error?.status || error?.response?.status || 0)
      // Do not log token, request headers, or raw error bodies.
      reason = status === 401 || status === 403 ? 'access' : 'query'
      console.warn('[birthday-preview] Draft query failed', {reason, status: status || undefined})
    }
  } else {
    reason = 'missing-token'
    console.warn('[birthday-preview] No server-side token configured for draft access')
  }

  try {
    // Never render a blank error state if a usable published birthday
    // record exists. This fallback is still protected by Studio Basic Auth.
    const experience = await sanityFetch(BIRTHDAY_EXPERIENCE_QUERY)
    if (experience) {
      return {
        experience,
        source: 'published',
        warning: reason === 'access'
          ? 'Draft access needs a valid Sanity read token. Showing your last published version.'
          : 'Unpublished edits are temporarily unavailable. Showing your last published version.',
        error: null,
      }
    }
  } catch (error) {
    console.warn('[birthday-preview] Published fallback unavailable', {
      status: Number(error?.statusCode || error?.status || 0) || undefined,
    })
  }

  return {
    experience: null,
    source: 'none',
    error: 'Could not load the birthday document. Please check Sanity connectivity and try again.',
  }
}
