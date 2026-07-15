import { createHash } from 'node:crypto'

export class PromotionSourceAdapter {
  constructor(source) {
    this.source = source
  }

  async discoverPromotionUrls() {
    throw new Error('discoverPromotionUrls() must be implemented by the source adapter')
  }

  async fetchPromotion() {
    throw new Error('fetchPromotion() must be implemented by the source adapter')
  }

  async extractPromotion() {
    throw new Error('extractPromotion() must be implemented by the source adapter')
  }
}

export function normalizeCanonicalUrl(input, baseUrl) {
  const url = new URL(input, baseUrl)
  url.hash = ''

  const ignored = new Set([
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'fbclid',
  ])

  for (const key of [...url.searchParams.keys()]) {
    if (ignored.has(key.toLowerCase())) url.searchParams.delete(key)
  }

  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '')
  url.searchParams.sort()
  return url.toString()
}

export function sha256Hex(value) {
  return createHash('sha256').update(String(value || '')).digest('hex')
}

export async function fetchWithTimeout(url, options = {}) {
  const timeoutMs = Math.max(1000, Number(options.timeoutMs || 15000))
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      redirect: 'follow',
      ...options,
      signal: controller.signal,
      headers: {
        'user-agent': 'VertolioPromoMonitor/1.0 (+https://farhanje.com/promos)',
        accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.7',
        ...(options.headers || {}),
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

export function stripHtml(input) {
  return String(input || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h1|h2|h3|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;|&#39;|&apos;/gi, "'")
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function extractTitleFromHtml(html) {
  const h1 = String(html || '').match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)
  if (h1?.[1]) return stripHtml(h1[1]).trim()

  const title = String(html || '').match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)
  return title?.[1] ? stripHtml(title[1]).trim() : ''
}

export function readJsonLd(html) {
  const blocks = []
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match

  while ((match = pattern.exec(String(html || '')))) {
    try {
      const parsed = JSON.parse(match[1].trim())
      if (Array.isArray(parsed)) blocks.push(...parsed)
      else blocks.push(parsed)
    } catch (_) {
      // Invalid JSON-LD should not fail the whole source.
    }
  }

  return blocks
}
