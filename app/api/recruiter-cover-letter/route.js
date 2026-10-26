import {sanityFetch} from '../../../lib/sanity.client'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Serve uploaded PDFs through the same origin so the browser can embed them reliably.
const COVER_LETTER_BY_CODE = `*[
  _type == "recruiterLink" &&
  linkCode.current == $code &&
  active == true &&
  (!defined(expiresAt) || expiresAt > now())
][0]{
  coverLetter{asset->{url, mimeType, originalFilename}}
}`

function safeFilename(value) {
  const filename = String(value || 'cover-letter.pdf')
    .split(/[\\/]/).pop()
    .replace(/[\r\n";]/g, '')
    .trim()
  return filename && filename.toLowerCase().endsWith('.pdf')
    ? filename
    : 'cover-letter.pdf'
}

export async function GET(request) {
  const url = new URL(request.url)
  const code = String(url.searchParams.get('code') || '').trim().toLowerCase()

  if (!/^[a-z0-9-]{3,80}$/.test(code)) {
    return new Response('Cover letter unavailable', {status: 404})
  }

  let recruiter
  try {
    recruiter = await sanityFetch(COVER_LETTER_BY_CODE, {code})
  } catch (_) {
    return new Response('Unable to load cover letter', {status: 503})
  }

  const asset = recruiter?.coverLetter?.asset
  if (!asset?.url || asset?.mimeType !== 'application/pdf') {
    return new Response('Cover letter unavailable', {status: 404})
  }

  // Only proxy file assets from our own Sanity dataset, never arbitrary URLs.
  let source
  try {
    source = new URL(asset.url)
  } catch (_) {
    return new Response('Invalid cover letter file', {status: 502})
  }
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'iq6vjwu7'
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
  if (
    source.protocol !== 'https:' ||
    source.hostname !== 'cdn.sanity.io' ||
    !source.pathname.startsWith(`/files/${projectId}/${dataset}/`)
  ) {
    return new Response('Invalid cover letter file', {status: 502})
  }

  const range = request.headers.get('range')
  let upstream
  try {
    upstream = await fetch(source.toString(), {
      cache: 'no-store',
      redirect: 'error',
      headers: range ? {Range: range} : undefined,
    })
  } catch (_) {
    return new Response('Unable to fetch cover letter', {status: 502})
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new Response('Unable to fetch cover letter', {status: 502})
  }

  const filename = safeFilename(asset.originalFilename)
  const download = url.searchParams.get('download') === '1'
  const headers = new Headers({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
    'Cache-Control': 'private, no-store, max-age=0',
    'Accept-Ranges': upstream.headers.get('accept-ranges') || 'bytes',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, noarchive',
  })

  for (const name of ['content-length', 'content-range', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name)
    if (value) headers.set(name, value)
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  })
}
