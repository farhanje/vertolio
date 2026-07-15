import { BoundedGenericHtmlPromotionAdapter } from './bounded-generic-adapter'
import { extractAnchorLinks } from './generic-html-adapter'
import { fetchWithTimeout } from './base-adapter'

function isBcaPromotionDetail(url) {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.endsWith('bca.co.id')) return false
    return /\/id\/(?:[^/]+\/)?20\d{2}\/\d{2}\/\d{2}\//i.test(parsed.pathname)
  } catch (_) {
    return false
  }
}

function paymentMethodsFromText(text) {
  const methods = []
  const candidates = [
    ['QRIS', /\bqris\b/i],
    ['myBCA', /\bmybca\b/i],
    ['BCA mobile', /\bbca\s+mobile\b/i],
    ['Kartu Kredit BCA', /kartu\s+kredit\s+bca/i],
    ['Kartu Debit BCA', /kartu\s+debit\s+bca/i],
    ['Sakuku', /\bsakuku\b/i],
    ['Reward BCA', /reward\s+bca/i],
  ]

  for (const [label, pattern] of candidates) {
    if (pattern.test(text)) methods.push(label)
  }
  return methods
}

function sameDate(left, right) {
  if (!left || !right) return false
  const a = new Date(left)
  const b = new Date(right)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10)
}

function hasExplicitDateRange(text) {
  return /\b\d{1,2}\s+[A-Za-z]+(?:\s+20\d{2})?\s*(?:-|–|—|sampai|hingga|to)\s*\d{1,2}\s+[A-Za-z]+\s+20\d{2}\b/i.test(text)
    || /\b\d{1,2}\s*(?:-|–|—|sampai|hingga|to)\s*\d{1,2}\s+[A-Za-z]+\s+20\d{2}\b/i.test(text)
}

export class BcaPromotionAdapter extends BoundedGenericHtmlPromotionAdapter {
  getBoundaryContract({title} = {}) {
    return {
      startMarkers: title ? [title] : [],
      endMarkers: [
        /^Bagikan promo ini$/i,
        /^Promo Serupa$/i,
        /^Lihat semua promo$/i,
      ],
      startOccurrence: 'first',
      requireStart: Boolean(title),
      requireEnd: true,
      maxChars: 18000,
    }
  }

  async discoverPromotionUrls() {
    const response = await fetchWithTimeout(this.source.base_url, {
      timeoutMs: this.source.request_timeout_ms,
    })
    if (!response.ok) throw new Error(`BCA discovery returned HTTP ${response.status}`)

    const html = await response.text()
    const links = extractAnchorLinks(html, this.source.base_url, {sameHostname: false})
      .filter((item) => isBcaPromotionDetail(item.url))

    const unique = new Map()
    for (const item of links) {
      if (!unique.has(item.url)) unique.set(item.url, item)
    }

    return [...unique.values()].slice(0, Number(this.source.max_pages_per_run || 25))
  }

  async extractPromotion(document) {
    const extracted = await super.extractPromotion(document)
    const title = extracted.extractedFields.title || ''
    const merchant = title.includes(' - ') ? title.split(' - ')[0].trim() : null
    const text = extracted.rawRelevantText || extracted.extractedFields.termsText || ''
    const paymentMethods = paymentMethodsFromText(text)
    const startsAt = extracted.extractedFields.startsAt
    const expiresAt = extracted.extractedFields.expiresAt

    extracted.extractedFields.merchant = merchant
    extracted.extractedFields.provider = 'BCA'
    extracted.extractedFields.paymentMethods = paymentMethods
    extracted.extractedFields.channels = []

    // BCA often repeats the same expiry in "Berlaku Hingga" and "Periode
    // promo hingga". A generic date collector can otherwise mistake those two
    // identical mentions for a start/end range.
    if (
      sameDate(startsAt, extracted.publicationDate)
      || (sameDate(startsAt, expiresAt) && !hasExplicitDateRange(text))
      || (startsAt && expiresAt && new Date(startsAt) > new Date(expiresAt))
    ) {
      extracted.extractedFields.startsAt = null
    }

    if (merchant) extracted.extractionConfidence = Math.min(1, extracted.extractionConfidence + 0.04)
    if (paymentMethods.length) extracted.extractionConfidence = Math.min(1, extracted.extractionConfidence + 0.04)
    extracted.extractionConfidence = Number(extracted.extractionConfidence.toFixed(3))
    return extracted
  }
}
