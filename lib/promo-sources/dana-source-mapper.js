import {createHash} from 'node:crypto'
import {
  findFixedMonetaryBenefit,
  findMinimumSpend,
  matchMoney,
  matchPercentage,
} from './money-parser.js'

export const DANA_SOURCE_MAPPER_VERSION = 'dana-source-map-v1'

const DAY_PATTERNS = [
  ['Senin', /\bsenin\b/i],
  ['Selasa', /\bselasa\b/i],
  ['Rabu', /\brabu\b/i],
  ['Kamis', /\bkamis\b/i],
  ['Jumat', /\bjumat\b|\bjum'at\b/i],
  ['Sabtu', /\bsabtu\b/i],
  ['Minggu', /\bminggu\b/i],
]

function sha256Hex(value) {
  return createHash('sha256').update(String(value || '')).digest('hex')
}

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function unique(values) {
  return [...new Set((values || []).map(normalize).filter(Boolean))]
}

function dateOnly(value) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

function normalizedTitle(value) {
  return normalize(value).replace(/\s*\*+\s*$/, '').trim()
}

function merchantFromTitle(titleInput) {
  const title = normalizedTitle(titleInput)
  const known = [
    ['Es Teler 77', /\bes\s+teler\s*77\b/i],
    ['Circle K', /\bcircle\s*k\b/i],
    ['Alfamart', /\balfamart\b/i],
    ['Dunia Games', /\bdunia\s+games\b/i],
    ['UPoint', /\bupoint\b/i],
    ['Wonder by BNI', /\bwonder\s+by\s+bni\b/i],
    ['GOCpay', /\bgocpay\b/i],
    ['SE’Indonesia', /\bse[’'`]?indonesia\b/i],
  ]
  for (const [merchant, pattern] of known) {
    if (pattern.test(title)) return merchant
  }

  if (/dana\.id\/games|\bdana\s+games\b/i.test(title)) return 'DANA Games'

  const afterDi = title.match(/\bdi\s+(.+?)(?=\s+(?:cashback|diskon|hemat|bonus|voucher|pakai|dengan|via)\b|[!*]|$)/i)
  if (afterDi?.[1]) return normalize(afterDi[1]).slice(0, 120)

  const afterPakai = title.match(/\bpakai\s+(.+?)(?=[!*]|$)/i)
  if (afterPakai?.[1] && !/^dana(?:\s+qris)?$/i.test(normalize(afterPakai[1]))) {
    return normalize(afterPakai[1]).slice(0, 120)
  }

  return 'DANA'
}

function categoryFor(titleInput, hint = {}) {
  const sourceLabel = normalize(hint.sourceCategoryLabel).toLowerCase()
  const sourceMap = {
    food: 'food_dining',
    entertainment: 'entertainment',
    game: 'entertainment',
    bank: 'financial_services',
    others: 'other',
    other: 'other',
  }
  if (sourceMap[sourceLabel]) return {primaryCategory: sourceMap[sourceLabel], sourceCategoryLabel: hint.sourceCategoryLabel}

  const title = normalizedTitle(titleInput)
  if (/alfamart|circle\s*k|minimarket|supermarket/i.test(title)) return {primaryCategory: 'groceries', sourceCategoryLabel: null}
  if (/es\s+teler|food|makan|minum|restaurant|restoran|cafe|kopi/i.test(title)) return {primaryCategory: 'food_dining', sourceCategoryLabel: null}
  if (/game|gaming|genesis|hero|upoint|roblox|voucher\s+google\s+play|dramabox/i.test(title)) return {primaryCategory: 'entertainment', sourceCategoryLabel: null}
  if (/bni|bank|top\s+up\s+saldo\s+dana/i.test(title)) return {primaryCategory: 'financial_services', sourceCategoryLabel: null}
  if (/tagihan|listrik|pulsa|data|internet/i.test(title)) return {primaryCategory: 'bills_utilities', sourceCategoryLabel: null}
  return {primaryCategory: 'other', sourceCategoryLabel: null}
}

function paymentMethods(text) {
  const methods = []
  if (/\bdana\s+qris\b|\bqris\s+dana\b/i.test(text)) methods.push('DANA QRIS')
  if (/\bsaldo\s+dana\b|\bdana\s+balance\b/i.test(text)) methods.push('Saldo DANA')
  if (!methods.length && /\b(?:pakai|menggunakan|melalui|use)\s+dana\b|\bdi\s+aplikasi\s+dana\b/i.test(text)) methods.push('DANA')
  return unique(methods)
}

function availability(text) {
  const channels = []
  const nationwide = /\bsemua\s+outlet\b[^.\n]{0,140}\b(?:di\s+)?indonesia\b|\bseluruh\s+indonesia\b/i.test(text)
  const outlet = /\b(?:semua|seluruh|outlet|gerai|merchant)\b/i.test(text)
  const website = /dana\.id\/games|\bwebsite\b|\bsitus\b|\bweb\b/i.test(text)
  const inApp = /\baplikasi\s+dana\b|\bdi\s+dana\b|\bmelalui\s+dana\b/i.test(text)

  if (outlet) channels.push('merchant_outlet', 'offline')
  if (website) channels.push('website', 'online')
  if (inApp) channels.push('in_app', 'online')

  let locationScope = 'unknown'
  if (nationwide) locationScope = 'nationwide'
  else if (outlet) locationScope = 'outlet'
  else if (website || inApp) locationScope = 'online'

  return {
    locationScope,
    channels: unique(channels),
    cities: [],
    provinces: [],
    outlets: [],
    evidence: normalize(String(text).split('\n').find((line) => /semua\s+outlet|seluruh\s+indonesia|dana\.id\/games|aplikasi\s+dana/i.test(line)) || ''),
  }
}

function benefitFields(text, title) {
  const percentage = matchPercentage(text)
  const fixedBenefit = percentage ? null : findFixedMonetaryBenefit(text)
  const maximumBenefit = matchMoney(text, [
    'maks(?:imum|imal)?',
    'max(?:imum)?',
  ], {maxDistance: 30})
  const minimumSpend = findMinimumSpend(text)
  const cashback = /cashback/i.test(`${title}\n${text}`)

  return {
    minimumSpend,
    maximumBenefit,
    benefitType: percentage
      ? 'percentage'
      : fixedBenefit
        ? (cashback ? 'cashback_fixed' : 'discount_fixed')
        : null,
    benefitValue: percentage || fixedBenefit || null,
  }
}

function applicableDays(text) {
  return DAY_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([label]) => label)
}

function firstLine(text, pattern) {
  return String(text || '')
    .split('\n')
    .map(normalize)
    .find((line) => line && pattern.test(line)) || ''
}

function requirementsSummary({minimumSpend, paymentMethods: methods, text}) {
  const parts = []
  if (minimumSpend) parts.push(`Minimum transaksi Rp${new Intl.NumberFormat('id-ID').format(minimumSpend)}`)
  if (methods.length) parts.push(`Gunakan ${methods.join(', ')}`)
  const frequency = firstLine(text, /\b(?:1x|1\s+kali)\b.*\b(?:user|pengguna|transaksi)\b/i)
  if (frequency) parts.push(frequency)
  return unique(parts).join(' · ').slice(0, 700)
}

function listingDateReconciliation(detailExpiresAt, listingExpiresAt) {
  const detail = dateOnly(detailExpiresAt)
  const listing = dateOnly(listingExpiresAt)
  if (!detail && listing) return {expiresAt: listingExpiresAt, mismatch: false, authority: 'listing_fallback'}
  if (detail && listing && detail !== listing) return {expiresAt: detailExpiresAt, mismatch: true, authority: 'detail_conflict'}
  return {expiresAt: detailExpiresAt || listingExpiresAt || null, mismatch: false, authority: detail ? 'detail' : 'none'}
}

export function mapDanaPromotionFields(extracted) {
  const fields = extracted?.extractedFields || {}
  const hint = extracted?.sourceHint || {}
  const text = String(extracted?.rawRelevantText || fields.termsText || '')
  const title = normalizedTitle(fields.title || hint.title || '')
  const merchant = merchantFromTitle(title)
  const category = categoryFor(title, hint)
  const methods = paymentMethods(text)
  const mappedAvailability = availability(text)
  const benefit = benefitFields(text, title)
  const dates = listingDateReconciliation(fields.expiresAt, hint.listingExpiresAt)
  const quotaText = firstLine(text, /\bkuota\b/i)
  const eligibilitySummary = firstLine(text, /\b(?:kyc|non[-\s]?kyc|pengguna\s+baru|pertama\s+kali)\b/i)
  const contradictions = [...(fields.contradictions || [])]
  if (dates.mismatch) contradictions.push('DANA listing expiry differs from the explicit detail-page period')

  const offerSummary = title || fields.offerSummary || ''
  const mappedFields = {
    ...fields,
    title,
    merchant,
    provider: 'DANA',
    offerSummary,
    paymentMethods: methods,
    minimumSpend: benefit.minimumSpend,
    maximumBenefit: benefit.maximumBenefit,
    benefitType: benefit.benefitType,
    benefitValue: benefit.benefitValue,
    startsAt: fields.startsAt || null,
    expiresAt: dates.expiresAt,
    applicableDays: applicableDays(text),
    channels: mappedAvailability.channels,
    locationScope: mappedAvailability.locationScope,
    cities: mappedAvailability.cities,
    provinces: mappedAvailability.provinces,
    outlets: mappedAvailability.outlets,
    primaryCategory: category.primaryCategory,
    categories: [category.primaryCategory],
    sourceCategoryLabel: category.sourceCategoryLabel,
    requirementsSummary: requirementsSummary({minimumSpend: benefit.minimumSpend, paymentMethods: methods, text}),
    quotaText,
    eligibilitySummary,
    contradictions,
    sourceMappingAuthority: 'source_adapter',
    sourceMappingVersion: DANA_SOURCE_MAPPER_VERSION,
  }

  const mappingSnapshot = {
    merchant,
    primaryCategory: category.primaryCategory,
    paymentMethods: methods,
    minimumSpend: benefit.minimumSpend,
    benefitType: benefit.benefitType,
    benefitValue: benefit.benefitValue,
    maximumBenefit: benefit.maximumBenefit,
    startsAt: mappedFields.startsAt,
    expiresAt: mappedFields.expiresAt,
    dateAuthority: dates.authority,
    locationScope: mappedAvailability.locationScope,
    channels: mappedAvailability.channels,
  }

  return {
    fields: mappedFields,
    contentHash: sha256Hex(`${extracted.contentHash}|${DANA_SOURCE_MAPPER_VERSION}|${JSON.stringify(mappingSnapshot)}`),
    diagnostics: {
      sourceMappingVersion: DANA_SOURCE_MAPPER_VERSION,
      sourceCategoryLabel: category.sourceCategoryLabel,
      listingExpiresAt: hint.listingExpiresAt || null,
      dateAuthority: dates.authority,
      listingDetailExpiryMismatch: dates.mismatch,
      paymentMethods: methods,
      availabilityEvidence: mappedAvailability.evidence,
    },
  }
}
