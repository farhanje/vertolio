import {BoundedGenericHtmlPromotionAdapter} from './bounded-generic-adapter'
import {extractAnchorLinks} from './generic-html-adapter'
import {fetchWithTimeout, normalizeCanonicalUrl, stripHtml} from './base-adapter'
import {findDateRange} from './date-parser'
import {mapDanaPromotionFields} from './dana-source-mapper'

const LISTING_PAGE_LIMIT = 5
const GENERIC_LINK_TEXT = /^(lihat info selengkapnya|view full info|selengkapnya|detail|image)$/i

function canonicalDanaDetailUrl(input, baseUrl) {
  try {
    const normalized = new URL(normalizeCanonicalUrl(input, baseUrl))
    if (!/(^|\.)dana\.id$/i.test(normalized.hostname)) return null
    if (!/^\/promo\/[a-z0-9][a-z0-9-]+\/?$/i.test(normalized.pathname)) return null
    normalized.search = ''
    normalized.hash = ''
    if (normalized.pathname.length > 1) normalized.pathname = normalized.pathname.replace(/\/+$/, '')
    return normalized.toString()
  } catch (_) {
    return null
  }
}

function bestTitle(values = []) {
  return values
    .map((value) => String(value || '').replace(/\s+/g, ' ').trim())
    .filter((value) => value && !GENERIC_LINK_TEXT.test(value))
    .sort((left, right) => right.length - left.length)[0] || ''
}

function contextForCanonical(html, canonicalUrl, allCanonicalUrls) {
  const pathname = new URL(canonicalUrl).pathname
  const start = String(html || '').indexOf(pathname)
  if (start < 0) return ''

  let end = String(html || '').length
  for (const otherUrl of allCanonicalUrls) {
    if (otherUrl === canonicalUrl) continue
    const otherPath = new URL(otherUrl).pathname
    const candidate = String(html || '').indexOf(otherPath, start + pathname.length)
    if (candidate > start && candidate < end) end = candidate
  }

  return stripHtml(String(html || '').slice(start, Math.min(end, start + 7000)))
}

function listingOffers(html, listingUrl) {
  const links = extractAnchorLinks(html, listingUrl, {sameHostname: false})
  const grouped = new Map()

  for (const link of links) {
    const canonicalUrl = canonicalDanaDetailUrl(link.url, listingUrl)
    if (!canonicalUrl) continue
    const existing = grouped.get(canonicalUrl) || {canonicalUrl, titles: []}
    existing.titles.push(link.title)
    grouped.set(canonicalUrl, existing)
  }

  const canonicalUrls = [...grouped.keys()]
  return canonicalUrls.map((canonicalUrl) => {
    const item = grouped.get(canonicalUrl)
    const context = contextForCanonical(html, canonicalUrl, canonicalUrls)
    const dates = findDateRange(context)
    const title = bestTitle(item.titles)

    return {
      url: canonicalUrl,
      canonicalUrl,
      sourceUrl: canonicalUrl,
      title,
      hint: {
        title,
        listingExpiresAt: dates.expiresAt || null,
        listingEvidence: dates.evidence?.expiresAt || '',
      },
    }
  }).filter((item) => item.title)
}

function listingPageUrl(baseUrl, page) {
  const url = new URL(baseUrl)
  url.searchParams.set('lng', 'id')
  if (page > 1) url.searchParams.set('page', String(page))
  else url.searchParams.delete('page')
  return url.toString()
}

export class DanaPromotionAdapter extends BoundedGenericHtmlPromotionAdapter {
  getBoundaryContract({title} = {}) {
    return {
      startMarkers: title ? [title] : [],
      endMarkers: [
        /^Lihat Info Selengkapnya$/i,
        /^View Full Info$/i,
        /^Transaksi #?BEBASDRAMA Sekarang!?$/i,
        /^Use DANA & Be #?BEBASDRAMA!?$/i,
        /^Download DANA Sekarang$/i,
        /^Download DANA Now$/i,
        /^Promo (?:Lainnya|Serupa)$/i,
      ],
      startOccurrence: 'first',
      requireStart: Boolean(title),
      requireEnd: true,
      maxChars: 20000,
    }
  }

  async discoverPromotionUrls() {
    const unique = new Map()
    let emptyPageCount = 0
    const configuredLimit = Number(this.source?.adapter_config?.listing_page_limit || LISTING_PAGE_LIMIT)
    const pageLimit = Math.max(1, Math.min(configuredLimit, LISTING_PAGE_LIMIT))

    for (let page = 1; page <= pageLimit; page += 1) {
      const url = listingPageUrl(this.source.base_url, page)
      const response = await fetchWithTimeout(url, {timeoutMs: this.source.request_timeout_ms})
      if (!response.ok) {
        if (page === 1) throw new Error(`DANA discovery returned HTTP ${response.status}`)
        break
      }

      const offers = listingOffers(await response.text(), url)
      let added = 0
      for (const offer of offers) {
        if (unique.has(offer.canonicalUrl)) continue
        unique.set(offer.canonicalUrl, offer)
        added += 1
      }

      if (!offers.length || added === 0) emptyPageCount += 1
      else emptyPageCount = 0
      if (page > 1 && emptyPageCount >= 1) break
    }

    return [...unique.values()].slice(0, Number(this.source.max_pages_per_run || 100))
  }

  async extractPromotion(document) {
    const extracted = await super.extractPromotion(document)
    extracted.sourceHint = document.promotionHint || {}
    const mapped = mapDanaPromotionFields(extracted)

    extracted.extractedFields = mapped.fields
    extracted.contentHash = mapped.contentHash
    extracted.boundaryDiagnostics = {
      ...(extracted.boundaryDiagnostics || {}),
      sourceMapping: mapped.diagnostics,
    }

    const warnings = new Set(extracted.ambiguityWarnings || [])
    if (mapped.diagnostics.listingDetailExpiryMismatch) warnings.add('listing_detail_expiry_mismatch')
    extracted.ambiguityWarnings = [...warnings]

    const complete = mapped.fields.merchant
      && mapped.fields.offerSummary
      && mapped.fields.expiresAt
      && mapped.fields.locationScope !== 'unknown'
    extracted.extractionConfidence = Number(Math.min(1, Math.max(
      Number(extracted.extractionConfidence || 0),
      complete ? 0.94 : 0.86,
    )).toFixed(3))

    delete extracted.sourceHint
    return extracted
  }
}
