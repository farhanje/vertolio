import imageUrlBuilder from '@sanity/image-url'
import { sanity } from './sanity.client'

const builder = imageUrlBuilder(sanity)

export function urlFor(source) {
  // Guard: image objects can exist without an asset reference (drafts/partial uploads)
  if (!source || !source.asset) return null
  return builder.image(source)
}
