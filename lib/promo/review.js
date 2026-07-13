import { calculatePromotionValue } from './calculations'

const BENEFIT_TYPES = new Set([
  'percentage',
  'cashback_fixed',
  'discount_fixed',
  'points',
  'other',
])

function nullableString(value, maxLength = 500) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  if (normalized.length > maxLength) throw new Error(`Text must be under ${maxLength} characters`)
  return normalized
}

function nullableNumber(value, fieldName) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${fieldName} must be a non-negative number`)
  }
  return number
}

function stringList(value) {
  const values = Array.isArray(value)
    ? value
    : String(value || '').split(/[,\n]/)

  return [...new Set(values
    .map((item) => String(item || '').trim())
    .filter(Boolean))]
    .slice(0, 50)
}

function jsonObject(value) {
  if (value === null || value === undefined || value === '') return {}

  const parsed = typeof value === 'string' ? JSON.parse(value) : value
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('Eligibility must be a valid JSON object')
  }
  return parsed
}

function promoDate(value, endOfDay = false) {
  const normalized = String(value || '').trim()
  if (!normalized) return null

  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(`${normalized}T${endOfDay ? '23:59:59' : '00:00:00'}+07:00`)
    : new Date(normalized)

  if (Number.isNaN(candidate.getTime())) throw new Error(`Invalid date: ${normalized}`)
  return candidate.toISOString()
}

export function normalizeReviewFields(input = {}) {
  const title = String(input.title || '').trim()
  if (!title) throw new Error('Promotion title is required')
  if (title.length > 250) throw new Error('Promotion title must be under 250 characters')

  const benefitType = nullableString(input.benefitType, 40)
  if (benefitType && !BENEFIT_TYPES.has(benefitType)) {
    throw new Error('Unsupported benefit type')
  }

  const startsAt = promoDate(input.startsAt, false)
  const expiresAt = promoDate(input.expiresAt, true)
  if (startsAt && expiresAt && new Date(expiresAt) < new Date(startsAt)) {
    throw new Error('Expiry date cannot be earlier than the start date')
  }

  return {
    title,
    merchant: nullableString(input.merchant, 200),
    provider: nullableString(input.provider, 200),
    paymentMethods: stringList(input.paymentMethods),
    minimumSpend: nullableNumber(input.minimumSpend, 'Minimum spend'),
    benefitType,
    benefitValue: nullableNumber(input.benefitValue, 'Benefit value'),
    maximumBenefit: nullableNumber(input.maximumBenefit, 'Maximum benefit'),
    voucherCode: nullableString(input.voucherCode, 80),
    startsAt,
    expiresAt,
    applicableDays: stringList(input.applicableDays),
    eligibility: jsonObject(input.eligibility),
    channels: stringList(input.channels),
    termsText: nullableString(input.termsText, 100000),
  }
}

export function statusFromReviewFields(fields, now = new Date()) {
  const start = fields.startsAt ? new Date(fields.startsAt) : null
  const expiry = fields.expiresAt ? new Date(fields.expiresAt) : null

  if (expiry && expiry.getTime() < now.getTime()) return 'expired'
  if (start && start.getTime() > now.getTime()) return 'upcoming'
  if (expiry && expiry.getTime() - now.getTime() <= 7 * 86400000) return 'expiring_soon'
  return 'active'
}

export function promotionUpdateFromReview(fields, now = new Date()) {
  return {
    title: fields.title,
    merchant: fields.merchant,
    provider: fields.provider,
    payment_methods: fields.paymentMethods,
    minimum_spend: fields.minimumSpend,
    benefit_type: fields.benefitType,
    benefit_value: fields.benefitValue,
    maximum_benefit: fields.maximumBenefit,
    voucher_code: fields.voucherCode,
    starts_at: fields.startsAt,
    expires_at: fields.expiresAt,
    applicable_days: fields.applicableDays,
    eligibility: fields.eligibility,
    channels: fields.channels,
    terms_text: fields.termsText,
    calculated_values: calculatePromotionValue(fields, now),
    status: statusFromReviewFields(fields, now),
    publication_status: 'published',
    published_at: now.toISOString(),
    last_verified_at: now.toISOString(),
  }
}

export function promotionSnapshot(promotion = {}) {
  return {
    title: promotion.title || '',
    merchant: promotion.merchant || null,
    provider: promotion.provider || null,
    paymentMethods: promotion.payment_methods || [],
    minimumSpend: promotion.minimum_spend ?? null,
    benefitType: promotion.benefit_type || null,
    benefitValue: promotion.benefit_value ?? null,
    maximumBenefit: promotion.maximum_benefit ?? null,
    voucherCode: promotion.voucher_code || null,
    startsAt: promotion.starts_at || null,
    expiresAt: promotion.expires_at || null,
    applicableDays: promotion.applicable_days || [],
    eligibility: promotion.eligibility || {},
    channels: promotion.channels || [],
    termsText: promotion.terms_text || null,
  }
}
