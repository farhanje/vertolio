import { PromotionSourceAdapter, fetchWithTimeout, sha256Hex, stripHtml } from './base-adapter'
import { decodeHtmlAttribute } from './generic-html-adapter'

const GENERIC_ALT = /^(image|logo|uv logo|gift|favorite|ufood|ultra emas|cart|category|fb-pixel)$/i

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function findCatalogOffers(html, baseUrl) {
  const imagePattern = /<img\b[^>]*alt\s*=\s*(["'])(.*?)\1[^>]*>/gi
  const images = []
  let match

  while ((match = imagePattern.exec(String(html || '')))) {
    images.push({index: match.index, end: imagePattern.lastIndex, alt: decodeHtmlAttribute(match[2]).trim()})
  }

  const offers = []
  for (let index = 0; index < images.length; index += 1) {
    const current = images[index]
    const nextIndex = images[index + 1]?.index || Math.min(String(html || '').length, current.end + 900)
    const merchant = current.alt
    if (!merchant || GENERIC_ALT.test(merchant) || merchant.length < 2) continue

    const segment = String(html || '').slice(current.end, nextIndex)
    const text = stripHtml(segment).slice(0, 500)
    const percentageMatch = text.match(/(\d{1,3}(?:[.,]\d+)?)\s*%\s*(?:off|diskon)?/i)
    const percentage = percentageMatch ? Number(percentageMatch[1].replace(',', '.')) : null
    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) continue

    const fingerprint = sha256Hex(`${merchant}|${percentage}`).slice(0, 10)
    const url = new URL(baseUrl)
    url.searchParams.set('uv_offer', `${slugify(merchant)}-${fingerprint}`)

    offers.push({
      url: url.toString(),
      sourceUrl: baseUrl,
      canonicalUrl: url.toString(),
      embeddedDocument: `<html><head><title>${merchant} - Diskon ${percentage}%</title></head><body><h1>${merchant}</h1><p>Diskon ${percentage}% di katalog resmi Ultra Voucher.</p></body></html>`,
      hint: {merchant, percentage},
    })
  }

  return offers
}

export class UltraVoucherPromotionAdapter extends PromotionSourceAdapter {
  async discoverPromotionUrls() {
    const response = await fetchWithTimeout(this.source.base_url, {
      timeoutMs: this.source.request_timeout_ms,
    })
    if (!response.ok) throw new Error(`Ultra Voucher discovery returned HTTP ${response.status}`)

    const html = await response.text()
    const offers = findCatalogOffers(html, this.source.base_url)
    this.catalogOffers = offers
    const unique = new Map()
    for (const item of offers) {
      if (!unique.has(item.canonicalUrl)) unique.set(item.canonicalUrl, item)
    }
    return [...unique.values()].slice(0, Number(this.source.max_pages_per_run || 25))
  }

  async fetchPromotion(itemOrUrl) {
    const descriptor = typeof itemOrUrl === 'string' ? {url: itemOrUrl} : (itemOrUrl || {})
    const requestedUrl = descriptor.canonicalUrl || descriptor.url
    let offer = descriptor.embeddedDocument && descriptor.hint
      ? descriptor
      : (this.catalogOffers || []).find((item) => item.canonicalUrl === requestedUrl)

    if (!offer) {
      const response = await fetchWithTimeout(this.source.base_url, {
        timeoutMs: this.source.request_timeout_ms,
      })
      if (!response.ok) throw new Error(`Ultra Voucher catalog returned HTTP ${response.status}`)
      this.catalogOffers = findCatalogOffers(await response.text(), this.source.base_url)
      offer = this.catalogOffers.find((item) => item.canonicalUrl === requestedUrl)
    }

    if (!offer?.embeddedDocument || !offer?.hint) throw new Error('Ultra Voucher offer evidence is missing')
    return {
      sourceUrl: offer.sourceUrl,
      canonicalUrl: offer.canonicalUrl,
      body: offer.embeddedDocument,
      contentType: 'text/html',
      status: 200,
      headers: {},
      fetchedAt: new Date().toISOString(),
      promotionHint: offer.hint,
    }
  }

  async extractPromotion(document) {
    const merchant = document.promotionHint?.merchant
    const percentage = Number(document.promotionHint?.percentage)
    const title = `${merchant} - Diskon ${percentage}%`
    const relevantText = stripHtml(document.body)

    return {
      sourceUrl: document.sourceUrl,
      canonicalUrl: document.canonicalUrl,
      sourceTitle: title,
      rawRelevantText: relevantText,
      contentHash: sha256Hex(`${merchant}|${percentage}|${relevantText}`),
      publicationDate: null,
      boundaryDiagnostics: {
        status: 'catalog',
        originalCharacters: relevantText.length,
        boundedCharacters: relevantText.length,
        originalLines: relevantText.split('\n').filter(Boolean).length,
        boundedLines: relevantText.split('\n').filter(Boolean).length,
        removedCharacters: 0,
        startMarker: 'catalog-card',
        endMarker: 'catalog-card',
        startRequired: false,
        endRequired: false,
        startSatisfied: true,
        endSatisfied: true,
        truncated: false,
      },
      extractedFields: {
        title,
        merchant,
        provider: 'Ultra Voucher',
        paymentMethods: ['Ultra Voucher'],
        minimumSpend: null,
        benefitType: 'percentage',
        benefitValue: percentage,
        maximumBenefit: null,
        voucherCode: null,
        startsAt: null,
        expiresAt: null,
        applicableDays: [],
        eligibility: {},
        channels: ['online'],
        termsText: relevantText,
      },
      ambiguityWarnings: ['minimum_spend_unavailable', 'expiry_unavailable', 'catalog_offer_requires_detail_review'],
      extractionConfidence: 0.78,
      fetchedAt: document.fetchedAt,
      httpStatus: document.status,
      responseHeaders: document.headers,
    }
  }
}
