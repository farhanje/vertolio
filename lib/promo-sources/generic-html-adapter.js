import {
  PromotionSourceAdapter,
  extractTitleFromHtml,
  fetchWithTimeout,
  normalizeCanonicalUrl,
  readJsonLd,
  sha256Hex,
  stripHtml,
} from './base-adapter'

const PROMO_TERMS = [
  'promo',
  'promosi',
  'cashback',
  'cash back',
  'diskon',
  'discount',
  'voucher',
  'potongan',
  'hemat',
  'deal',
]

const MONTHS = {
  jan: 0,
  januari: 0,
  january: 0,
  feb: 1,
  februari: 1,
  february: 1,
  mar: 2,
  maret: 2,
  march: 2,
  apr: 3,
  april: 3,
  mei: 4,
  may: 4,
  jun: 5,
  juni: 5,
  june: 5,
  jul: 6,
  juli: 6,
  july: 6,
  agu: 7,
  agt: 7,
  agustus: 7,
  august: 7,
  sep: 8,
  september: 8,
  okt: 9,
  oktober: 9,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  des: 11,
  desember: 11,
  dec: 11,
  december: 11,
}

const MONTH_PATTERN = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join('|')

export function containsPromoTerm(value) {
  const normalized = String(value || '').toLowerCase()
  return PROMO_TERMS.some((term) => normalized.includes(term))
}

export function decodeHtmlAttribute(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
}

export function extractAnchorLinks(html, baseUrl, {sameHostname = true} = {}) {
  const links = []
  const pattern = /<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi
  let match

  while ((match = pattern.exec(String(html || '')))) {
    const href = decodeHtmlAttribute(match[2]).trim()
    const text = stripHtml(match[3])
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue

    try {
      const canonicalUrl = normalizeCanonicalUrl(href, baseUrl)
      const base = new URL(baseUrl)
      const target = new URL(canonicalUrl)
      if (!['http:', 'https:'].includes(target.protocol)) continue
      if (sameHostname && target.hostname !== base.hostname) continue
      links.push({ url: canonicalUrl, title: text || canonicalUrl })
    } catch (_) {
      // Ignore malformed links.
    }
  }

  return links
}

export function parseMoney(value, suffix = '') {
  if (!value) return null
  const normalized = String(value)
    .trim()
    .replace(/rp/gi, '')
    .replace(/\s+/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.]/g, '')

  const number = Number(normalized)
  if (!Number.isFinite(number)) return null

  const unit = String(suffix || '').toLowerCase()
  if (/^(ribu|rb|k)$/.test(unit)) return number * 1_000
  if (/^(juta|jt|million|mio)$/.test(unit)) return number * 1_000_000
  if (/^(miliar|billion)$/.test(unit)) return number * 1_000_000_000
  return number
}

export function matchMoney(text, labels) {
  for (const label of labels) {
    const regex = new RegExp(
      `${label}[^\\d]{0,40}(?:Rp\\s*)?([\\d.]+(?:,\\d+)?)(?:\\s*(ribu|rb|k|juta|jt|million|mio|miliar|billion))?`,
      'i',
    )
    const match = String(text || '').match(regex)
    const amount = parseMoney(match?.[1], match?.[2])
    if (amount !== null) return amount
  }
  return null
}

export function matchPercentage(text) {
  const candidates = [...String(text || '').matchAll(/(\d{1,3}(?:[.,]\d+)?)\s*%/g)]
    .map((match) => Number(String(match[1]).replace(',', '.')))
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 100)

  return candidates.length ? candidates[0] : null
}

function parseDateParts(day, monthName, year) {
  const month = MONTHS[String(monthName || '').toLowerCase()]
  if (month === undefined) return null

  const yyyy = Number(year)
  const dd = Number(day)
  if (!Number.isInteger(yyyy) || !Number.isInteger(dd)) return null

  const value = new Date(Date.UTC(yyyy, month, dd, 0, 0, 0))
  if (Number.isNaN(value.getTime())) return null
  if (value.getUTCMonth() !== month || value.getUTCDate() !== dd) return null
  return value.toISOString()
}

export function findDateRange(text) {
  const normalized = String(text || '')

  const sharedMonth = new RegExp(
    `(\\d{1,2})\\s*(?:-|–|—|sampai|hingga|to)\\s*(\\d{1,2})\\s+(${MONTH_PATTERN})\\s+(20\\d{2})`,
    'i',
  ).exec(normalized)

  if (sharedMonth) {
    return {
      startsAt: parseDateParts(sharedMonth[1], sharedMonth[3], sharedMonth[4]),
      expiresAt: parseDateParts(sharedMonth[2], sharedMonth[3], sharedMonth[4]),
    }
  }

  const datePattern = new RegExp(`(\\d{1,2})\\s+(${MONTH_PATTERN})\\s+(20\\d{2})`, 'gi')
  const dates = []
  let match
  let firstDateIndex = -1

  while ((match = datePattern.exec(normalized))) {
    const iso = parseDateParts(match[1], match[2], match[3])
    if (iso) {
      if (firstDateIndex === -1) firstDateIndex = match.index
      dates.push(iso)
    }
    if (dates.length >= 4) break
  }

  if (dates.length >= 2) return { startsAt: dates[0], expiresAt: dates[dates.length - 1] }
  if (dates.length === 1) {
    const prefix = normalized.slice(Math.max(0, firstDateIndex - 80), firstDateIndex).toLowerCase()
    if (/berakhir|hingga|sampai|end|valid until|periode/.test(prefix)) return { startsAt: null, expiresAt: dates[0] }
    return { startsAt: dates[0], expiresAt: null }
  }

  const isoDates = [...normalized.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)]
    .map((item) => new Date(`${item[1]}-${item[2]}-${item[3]}T00:00:00.000Z`).toISOString())

  if (isoDates.length >= 2) return { startsAt: isoDates[0], expiresAt: isoDates[isoDates.length - 1] }
  if (isoDates.length === 1) return { startsAt: null, expiresAt: isoDates[0] }
  return { startsAt: null, expiresAt: null }
}

export function findVoucherCode(text) {
  const match = String(text || '').match(/(?:kode\s+(?:promo|voucher)|promo\s+code|voucher\s+code)\s*[:\-]?\s*([A-Z0-9_-]{4,24})/i)
  return match?.[1] || null
}

function pickJsonLdDate(blocks, key) {
  for (const block of blocks) {
    const candidate = block?.[key] || block?.offers?.[key]
    if (!candidate) continue
    const date = new Date(candidate)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }
  return null
}

export class GenericHtmlPromotionAdapter extends PromotionSourceAdapter {
  async discoverPromotionUrls() {
    const response = await fetchWithTimeout(this.source.base_url, {
      timeoutMs: this.source.request_timeout_ms,
    })

    if (!response.ok) {
      throw new Error(`Source discovery returned HTTP ${response.status}`)
    }

    const html = await response.text()
    const discovered = extractAnchorLinks(html, this.source.base_url)
      .filter((item) => containsPromoTerm(`${item.url} ${item.title}`))
    const unique = new Map()

    for (const item of discovered) {
      if (!unique.has(item.url)) unique.set(item.url, item)
    }

    if (containsPromoTerm(`${extractTitleFromHtml(html)} ${stripHtml(html).slice(0, 4000)}`)) {
      const canonical = normalizeCanonicalUrl(this.source.base_url, this.source.base_url)
      if (!unique.has(canonical)) unique.set(canonical, { url: canonical, title: extractTitleFromHtml(html) })
    }

    return [...unique.values()].slice(0, Number(this.source.max_pages_per_run || 25))
  }

  async fetchPromotion(itemOrUrl) {
    const descriptor = typeof itemOrUrl === 'string' ? {url: itemOrUrl} : (itemOrUrl || {})

    if (descriptor.embeddedDocument) {
      return {
        sourceUrl: descriptor.sourceUrl || this.source.base_url,
        canonicalUrl: descriptor.canonicalUrl || descriptor.url,
        body: descriptor.embeddedDocument,
        contentType: 'text/html',
        status: 200,
        headers: {},
        fetchedAt: new Date().toISOString(),
        promotionHint: descriptor.hint || null,
      }
    }

    const url = descriptor.url
    if (!url) throw new Error('Discovered promotion is missing a URL')

    const response = await fetchWithTimeout(url, {
      timeoutMs: this.source.request_timeout_ms,
    })

    const contentType = response.headers.get('content-type') || ''
    const body = await response.text()

    if (!response.ok) {
      throw new Error(`Promotion page returned HTTP ${response.status}`)
    }

    if (!contentType.includes('html') && !contentType.includes('json') && !body.trim().startsWith('<')) {
      throw new Error(`Unsupported content type: ${contentType || 'unknown'}`)
    }

    return {
      sourceUrl: descriptor.sourceUrl || url,
      canonicalUrl: descriptor.canonicalUrl || normalizeCanonicalUrl(response.url || url, this.source.base_url),
      body,
      contentType,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      fetchedAt: new Date().toISOString(),
      promotionHint: descriptor.hint || null,
    }
  }

  async extractPromotion(document) {
    const hint = document.promotionHint || {}
    const title = hint.title || extractTitleFromHtml(document.body)
    const rawText = stripHtml(document.body)
    const relevantText = rawText.slice(0, 30000)
    const jsonLd = readJsonLd(document.body)

    const minimumSpend = hint.minimumSpend ?? matchMoney(relevantText, [
      'minimum\\s+transaksi',
      'minimal\\s+transaksi',
      'min(?:imum)?\\.?\\s*spend',
      'minimum\\s+pembelian',
      'minimal\\s+pembelian',
    ])

    const maximumBenefit = hint.maximumBenefit ?? matchMoney(relevantText, [
      'maks(?:imum|imal)?\\s+(?:cashback|diskon|potongan|benefit)',
      'max(?:imum)?\\.?\\s+(?:cashback|discount|benefit)',
      '(?:cashback|diskon|potongan|discount)\\s+(?:hingga|up\\s+to)',
    ])

    const fixedBenefit = hint.fixedBenefit ?? matchMoney(relevantText, [
      'cashback',
      'potongan',
      'diskon',
      'discount',
      'voucher',
    ])

    const percentage = hint.percentage ?? matchPercentage(relevantText)
    const dates = findDateRange(relevantText)
    const startsAt = hint.startsAt || pickJsonLdDate(jsonLd, 'validFrom') || pickJsonLdDate(jsonLd, 'datePublished') || dates.startsAt
    const expiresAt = hint.expiresAt || pickJsonLdDate(jsonLd, 'validThrough') || pickJsonLdDate(jsonLd, 'expires') || dates.expiresAt
    const voucherCode = hint.voucherCode || findVoucherCode(relevantText)

    const benefitType = hint.benefitType || (percentage
      ? 'percentage'
      : fixedBenefit
        ? (/cashback/i.test(relevantText) ? 'cashback_fixed' : 'discount_fixed')
        : null)

    const benefitValue = hint.benefitValue ?? percentage ?? fixedBenefit
    const warnings = [...(hint.ambiguityWarnings || [])]

    if (!title) warnings.push('missing_title')
    if (!benefitType || !benefitValue) warnings.push('unclear_benefit')
    if (minimumSpend === null || minimumSpend === undefined) warnings.push('minimum_spend_unavailable')
    if (!expiresAt) warnings.push('expiry_unavailable')
    if (/syarat.*berlaku|kuota|selama persediaan/i.test(relevantText) && !/kuota\s*[:\-]?\s*\d+/i.test(relevantText)) {
      warnings.push('quota_or_limited_availability_requires_review')
    }

    let confidence = Number(hint.baseConfidence || 0.25)
    if (title) confidence += 0.2
    if (benefitType && benefitValue) confidence += 0.25
    if (minimumSpend !== null && minimumSpend !== undefined) confidence += 0.12
    if (startsAt || expiresAt) confidence += 0.1
    if (document.canonicalUrl) confidence += 0.08
    confidence = Math.min(1, Number(confidence.toFixed(3)))

    return {
      sourceUrl: document.sourceUrl,
      canonicalUrl: document.canonicalUrl,
      sourceTitle: title,
      rawRelevantText: relevantText,
      contentHash: sha256Hex(`${relevantText}\n${JSON.stringify(hint)}`),
      publicationDate: pickJsonLdDate(jsonLd, 'datePublished'),
      extractedFields: {
        title,
        merchant: hint.merchant || null,
        provider: hint.provider || this.source.name,
        paymentMethods: hint.paymentMethods || [],
        minimumSpend,
        benefitType,
        benefitValue,
        maximumBenefit,
        voucherCode,
        startsAt,
        expiresAt,
        applicableDays: hint.applicableDays || [],
        eligibility: hint.eligibility || {},
        channels: hint.channels || [],
        termsText: relevantText,
      },
      ambiguityWarnings: [...new Set(warnings)],
      extractionConfidence: confidence,
      fetchedAt: document.fetchedAt,
      httpStatus: document.status,
      responseHeaders: document.headers,
    }
  }
}
