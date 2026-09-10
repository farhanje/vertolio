import {sanityFetch} from '../../../lib/sanity.client'
import {SITE_SETTINGS_QUERY} from '../../../lib/sanity.queries'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function safeFilename(value) {
  const cleaned = String(value || 'resume.pdf')
    .replace(/[\r\n"]/g, '')
    .trim()
  return cleaned || 'resume.pdf'
}

export async function GET(request) {
  const settings = await sanityFetch(SITE_SETTINGS_QUERY)
  const sourceUrl = settings?.resumePdf?.asset?.url

  if (!sourceUrl) {
    return new Response('Resume unavailable', {status: 404})
  }

  const range = request.headers.get('range')
  const upstream = await fetch(sourceUrl, {
    cache: 'no-store',
    headers: range ? {Range: range} : undefined,
  })

  if (!upstream.ok && upstream.status !== 206) {
    return new Response('Unable to load resume', {status: 502})
  }

  const download = new URL(request.url).searchParams.get('download') === '1'
  const filename = safeFilename(settings?.resumePdf?.asset?.originalFilename)
  const headers = new Headers({
    'Content-Type': upstream.headers.get('content-type') || 'application/pdf',
    'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
    'Cache-Control': 'private, no-store, max-age=0',
    'Accept-Ranges': upstream.headers.get('accept-ranges') || 'bytes',
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
