function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function unique(values) {
  return [...new Set((values || []).map(normalizeText).filter(Boolean))]
}

function money(value) {
  if (value === null || value === undefined || value === '') return null
  const amount = Number(value)
  if (!Number.isFinite(amount)) return null
  return `Rp${new Intl.NumberFormat('id-ID', {maximumFractionDigits: 0}).format(amount)}`
}

function offerFromStructuredBenefit(fields) {
  const value = Number(fields?.benefitValue)
  if (!Number.isFinite(value) || value <= 0) return ''
  if (fields.benefitType === 'percentage') return `Diskon ${value}%`
  if (fields.benefitType === 'cashback_fixed') return `Cashback ${money(value)}`
  if (fields.benefitType === 'discount_fixed') return `Potongan ${money(value)}`
  if (fields.benefitType === 'points') return `${value} poin`
  return ''
}

function offerFromTitle(title, merchant) {
  const value = normalizeText(title)
  if (!value) return ''
  const separators = [' - ', ' – ', ' — ', ': ']
  for (const separator of separators) {
    const parts = value.split(separator).map(normalizeText).filter(Boolean)
    if (parts.length < 2) continue
    const first = parts[0].toLowerCase()
    const merchantMatches = !merchant || first === normalizeText(merchant).toLowerCase()
    if (merchantMatches || parts.length === 2) {
      return parts.slice(1).join(separator).slice(0, 280)
    }
  }
  return ''
}

const NON_OFFER_LINE = /^(home|promo bca|syarat\s*&?\s*ketentuan|bagi pengguna|berlaku hingga|periode promo|bagikan promo|promo serupa|lihat semua promo|ajukan kartu)/i
const OFFER_CUE = /\b(dapatkan|diskon|discount|cashback|cash back|potongan|hemat|harga spesial|special price|gratis|free|bonus|ekstra|extra|reward|beli\s+\d+|buy\s+\d+|voucher)\b/i

function offerFromText(text, title) {
  const normalizedTitle = normalizeText(title).toLowerCase()
  const lines = String(text || '')
    .split('\n')
    .map(normalizeText)
    .filter((line) => line.length >= 4 && line.length <= 320)
    .filter((line) => line.toLowerCase() !== normalizedTitle)
    .filter((line) => !NON_OFFER_LINE.test(line))

  return lines.find((line) => OFFER_CUE.test(line)) || ''
}

export function deriveOfferSummary(fields = {}, text = '') {
  return normalizeText(
    fields.offerSummary
    || offerFromTitle(fields.title, fields.merchant)
    || offerFromStructuredBenefit(fields)
    || offerFromText(text, fields.title),
  ).slice(0, 320)
}

export function deriveRequirementsSummary(fields = {}, text = '') {
  const requirements = []
  const minimumSpend = money(fields.minimumSpend)
  if (minimumSpend) requirements.push(`Minimum transaksi ${minimumSpend}`)
  if (Array.isArray(fields.paymentMethods) && fields.paymentMethods.length) {
    requirements.push(`Gunakan ${unique(fields.paymentMethods).join(', ')}`)
  }
  if (fields.voucherCode) requirements.push(`Kode ${normalizeText(fields.voucherCode)}`)
  if (fields.eligibilitySummary) requirements.push(fields.eligibilitySummary)

  if (!requirements.length) {
    const lines = String(text || '').split('\n').map(normalizeText)
    const candidate = lines.find((line) => /\b(minimum|minimal|khusus|gunakan|dengan kartu|kode promo|kode voucher|berlaku untuk)\b/i.test(line))
    if (candidate) requirements.push(candidate)
  }

  return unique(requirements).join(' · ').slice(0, 700)
}

function hasAvailability(fields = {}, text = '') {
  if (fields.locationScope && fields.locationScope !== 'unknown') return true
  if (Array.isArray(fields.channels) && fields.channels.length) return true
  if (Array.isArray(fields.outlets) && fields.outlets.length) return true
  if (Array.isArray(fields.cities) && fields.cities.length) return true
  if (Array.isArray(fields.provinces) && fields.provinces.length) return true
  return /\b(berlaku di|tersedia di|seluruh outlet|semua outlet|online|website|aplikasi|app|marketplace|mall|plaza|cabang|gerai)\b/i.test(text)
}

function isCatalogSource(source, extracted) {
  if (source?.adapter_key === 'ultra-voucher') return true
  return (extracted?.ambiguityWarnings || []).includes('catalog_offer_requires_detail_review')
}

function boundaryIsSafe(diagnostics = {}) {
  if (!diagnostics?.endRequired && !diagnostics?.startRequired) return true
  return diagnostics.startSatisfied !== false && diagnostics.endSatisfied !== false && diagnostics.status !== 'truncated'
}

export function evaluatePublishability(extracted, source) {
  const fields = extracted?.extractedFields || {}
  const text = extracted?.rawRelevantText || fields.termsText || ''
  const boundaryDiagnostics = extracted?.boundaryDiagnostics || {}
  const offerSummary = deriveOfferSummary(fields, text)
  const requirementsSummary = deriveRequirementsSummary(fields, text)
  const catalogListing = isCatalogSource(source, extracted) && !fields.expiresAt
  const checks = {
    merchant: Boolean(normalizeText(fields.merchant)),
    offerSummary: Boolean(offerSummary),
    validity: Boolean(fields.expiresAt) || catalogListing,
    availability: hasAvailability(fields, text) || catalogListing,
    source: Boolean(extracted?.sourceUrl && extracted?.canonicalUrl),
    boundary: boundaryIsSafe(boundaryDiagnostics),
  }
  const missingFields = Object.entries(checks).filter(([, passed]) => !passed).map(([key]) => key)
  const resolvableFields = missingFields.filter((field) => ['merchant', 'offerSummary', 'validity', 'availability'].includes(field))
  const score = Number((Object.values(checks).filter(Boolean).length / Object.keys(checks).length).toFixed(3))
  const status = missingFields.length
    ? 'unresolved'
    : catalogListing
      ? 'catalog_listing'
      : 'publishable'

  return {
    status,
    score,
    missingFields,
    resolvableFields,
    offerSummary,
    requirementsSummary,
    catalogListing,
    checks,
  }
}
