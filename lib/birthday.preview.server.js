import {createClient} from '@sanity/client'
import {BIRTHDAY_EXPERIENCE_QUERY} from './sanity.queries'

// Called exclusively from the password-protected /dear-ema Server Component.
// Never send the token or the client itself to a browser component.
export async function getBirthdayDraftPreview() {
  const token = process.env.SANITY_PREVIEW_READ_TOKEN ||
    process.env.SANITY_WRITE_TOKEN ||
    process.env.SANITY_READ_TOKEN ||
    process.env.SANITY_API_READ_TOKEN

  if (!token) {
    return {experience: null, error: 'A server-side Sanity token is required to preview unpublished drafts.'}
  }

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'iq6vjwu7'
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

  try {
    const client = createClient({
      projectId,
      dataset,
      apiVersion: '2025-01-01',
      useCdn: false,
      token,
      perspective: 'drafts',
    })
    const experience = await client.fetch(BIRTHDAY_EXPERIENCE_QUERY, {}, {
      cache: 'no-store',
      perspective: 'drafts',
    })
    return {experience, error: experience ? null : 'Birthday document not found in Sanity.'}
  } catch (_) {
    return {experience: null, error: 'Could not load the Sanity draft. Check the server token and try again.'}
  }
}
