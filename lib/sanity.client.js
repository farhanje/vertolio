import {createClient} from '@sanity/client'

// Keep projectId/dataset public (needed for studio + image URLs)
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

// If your dataset is private, set this in Vercel (NOT NEXT_PUBLIC)
// Sanity Manage → API → Tokens → create "Viewer" token
const token = process.env.SANITY_READ_TOKEN || process.env.SANITY_API_READ_TOKEN

export const sanity = createClient({
  projectId,
  dataset,
  apiVersion: '2025-01-01',
  // CDN can serve cached results; turn off for immediate updates.
  useCdn: false,
  // Only used if provided (recommended if dataset is private)
  token,
  perspective: 'published',
})

// Always fetch the latest published content (avoid Next/Vercel caching)
export function sanityFetch(query, params = {}) {
  return sanity.fetch(query, params, {
    cache: 'no-store',
    perspective: 'published',
  })
}
