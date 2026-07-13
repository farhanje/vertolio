import { getPromoLlmConfig, runPromoLlmStructured } from './llm'
import { deterministicSegmentation, PROMO_CATEGORIES } from './segmentation'

export const PROMO_INTELLIGENCE_VERSION = 'full-promo-v1'

const LOCATION_SCOPES = ['nationwide', 'online', 'regional', 'city', 'outlet', 'unknown']
const BENEFIT_TYPES = ['percentage', 'cashback_fixed', 'discount_fixed', 'points', 'other', 'unknown']
const CHANNELS = ['online', 'offline', 'in_app', 'website', 'merchant_outlet', 'other']
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const nullableNumber = {anyOf: [{type: 'number'}, {type: 'null'}]}

const FIELD_KEYS = [
  'title', 'merchant', 'provider', 'benefit', 'minimumSpend', 'maximumBenefit',
  'voucherCode', 'startsAt', 'expiresAt', 'applicableDays', 'paymentMethods',
  'channels', 'eligibility', 'quota', 'locations',
]

const PROMO_INTELLIGENCE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'isPromotion', 'promotionConfidence', 'normalizedTitle', 'merchant', 'provider',
    'benefitType', 'benefitValue', 'minimumSpend', 'maximumBenefit', 'voucherCode',
    'startsAt', 'expiresAt', 'applicableDays', 'paymentMethods', 'channels',
    'eligibility', 'eligibilitySummary', 'quotaText', 'primaryCategory', 'categories',
    'tags', 'locationScope', 'cities', 'provinces', 'outlets', 'summary',
    'fieldConfidence', 'evidence', 'warnings', 'contradictions',
  ],
  properties: {
    isPromotion: {type: 'boolean'},
    promotionConfidence: {type: 'number', minimum: 0, maximum: 1},
    normalizedTitle: {type: 'string'},
    merchant: {type: 'string'},
    provider: {type: 'string'},
    benefitType: {type: 'string', enum: BENEFIT_TYPES},
    benefitValue: nullableNumber,
    minimumSpend: nullableNumber,
    maximumBenefit: nullableNumber,
    voucherCode: {type: 'string'},
    startsAt: {type: 'string'},
    expiresAt: {type: 'string'},
    applicableDays: {type: 'array', items: {type: 'string', enum: DAYS}, maxItems: 7},
    paymentMethods: {type: 'array', items: {type: 'string'}, maxItems: 20},
    channels: {type: 'array', items: {type: 'string', enum: CHANNELS}, maxItems: 8},
    eligibility: {
      type: 'object',
      additionalProperties: false,
      required: ['newUserOnly', 'existingUserOnly', 'cardTier', 'customerSegment', 'otherRequirements'],
      properties: {
        newUserOnly: {type: 'boolean'},
        existingUserOnly: {type: 'boolean'},
        cardTier: {type: 'string'},
        customerSegment: {type: 'string'},
        otherRequirements: {type: 'array', items: {type: 'string'}, maxItems: 20},
      },
    },
    eligibilitySummary: {type: 'string'},
    quotaText: {type: 'string'},
    primaryCategory: {type: 'string', enum: PROMO_CATEGORIES},
    categories: {type: 'array', items: {type: 'string', enum: PROMO_CATEGORIES}, maxItems: 6},
    tags: {type: 'array', items: {type: 'string'}, maxItems: 24},
    locationScope: {type: 'string', enum: LOCATION_SCOPES},
    cities: {type: 'array', items: {type: 'string'}, maxItems: 100},
    provinces: {type: 'array', items: {type: 'string'}, maxItems: 50},
    outlets: {
      type: 'array',
      maxItems: 150,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['outletName', 'address', 'city', 'province', 'postalCode', 'sourceText'],
        properties: {
          outletName: {type: 'string'},
          address: {type: 'string'},
          city: {type: 'string'},
          province: {type: 'string'},
          postalCode: {type: 'string'},
          sourceText: {type: 'string'},
        },
      },
    },
    summary: {type: 'string'},
    fieldConfidence: {
      type: 'object',
      additionalProperties: false,
      required: FIELD_KEYS,
      properties: Object.fromEntries(FIELD_KEYS.map((key) => [key, {type: 'number', minimum: 0, maximum: 1}])),
    },
    evidence: {
      type: 'object',
      additionalProperties: false,
      required: FIELD_KEYS,
      properties: Object.fromEntries(FIELD_KEYS.map((key) => [key, {type: 'string'}])),
    },
    warnings: {type: 'array', items: {type: 'string'}, maxItems: 30},
    contradictions: {type: 'array', items: {type: 'string'}, maxItems: 20},
  },
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeEvidence(value) {
  return normalizeText(value).toLowerCase().replace(/[“”"'`]/g, '').replace(/\s*[-–—,:;.]\s*/g, ' ')
}

function unique(values) {
  return [...new Set((values || []).map(normalizeText).filter(Boolean))]
}

function evidenceMatches(sourceText, evidence) {
  const source = normalizeEvidence(sourceText)
  const needle = normalizeEvidence(evidence)
  return Boolean(needle && needle.length >= 3 && source.includes(needle))
}

function safeConfidence(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.min(number, 1)) : fallback
}

function safeNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

function normalizeDate(value, {endOfDay = false} = {}) {
  const text = normalizeText(value)
  if (!text) return null

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T${endOfDay ? '23:59:59.999' : '00:00:00'}+07:00`)
    : new Date(text)

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function supportedValue(result, sourceText, evidenceKey, rawValue, fallback, transform = (value) => value) {
  if (!evidenceMatches(sourceText, result?.evidence?.[evidenceKey])) return fallback
  const transformed = transform(rawValue)
  return transformed === undefined ? fallback : transformed
}

function assessSourceTrust(source, sourceUrl) {
  try {
    const base = new URL(source?.base_url)
    const page = new URL(sourceUrl)
    const sameHost = page.hostname === base.hostname || page.hostname.endsWith(`.${base.hostname}`)

    if (page.protocol !== 'https:') return {level: 'suspicious', reasons: ['Source page does not use HTTPS']}
    if (!sameHost) return {level: 'unverified', reasons: ['Promotion URL is outside the registered source domain']}
    if (source?.source_type === 'trusted_aggregator') {
      return {level: 'trusted_aggregator', reasons: ['Registered trusted promotion aggregator domain']}
    }
    return {level: 'official_source', reasons: ['Promotion URL matches the registered official source domain']}
  } catch (_) {
    return {level: 'suspicious', reasons: ['Source URL could not be validated']}
  }
}

function sanitizeOutlets(outlets, sourceText) {
  const seen = new Set()
  const result = []

  for (const item of Array.isArray(outlets) ? outlets : []) {
    const sourcePhrase = normalizeText(item?.sourceText).slice(0, 500)
    const outletName = normalizeText(item?.outletName).slice(0, 160)
    if (!outletName || !sourcePhrase || !evidenceMatches(sourceText, sourcePhrase)) continue

    const outlet = {
      outletName,
      address: normalizeText(item?.address) || null,
      city: normalizeText(item?.city) || null,
      province: normalizeText(item?.province) || null,
      postalCode: normalizeText(item?.postalCode) || null,
      sourceText: sourcePhrase,
    }
    const key = `${outlet.outletName}|${outlet.address || ''}|${outlet.city || ''}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(outlet)
  }

  return result.slice(0, 150)
}

function mergeOutlets(primary, fallback) {
  const seen = new Set()
  const result = []
  for (const outlet of [...(primary || []), ...(fallback || [])]) {
    const key = `${outlet.outletName}|${outlet.address || ''}|${outlet.city || ''}`.toLowerCase()
    if (!outlet.outletName || seen.has(key)) continue
    seen.add(key)
    result.push(outlet)
  }
  return result.slice(0, 150)
}

function sanitizeAiResult(result, sourceText, fallbackFields, deterministic) {
  if (!result || typeof result !== 'object') return null

  const fieldConfidence = Object.fromEntries(FIELD_KEYS.map((key) => [key, safeConfidence(result?.fieldConfidence?.[key])]))
  const fieldEvidence = Object.fromEntries(FIELD_KEYS.map((key) => [key, normalizeText(result?.evidence?.[key]).slice(0, 500)]))
  const categories = unique((result.categories || []).filter((item) => PROMO_CATEGORIES.includes(item)))
  const primaryCategory = PROMO_CATEGORIES.includes(result.primaryCategory)
    ? result.primaryCategory
    : categories[0] || deterministic.primaryCategory
  if (!categories.includes(primaryCategory)) categories.unshift(primaryCategory)

  const outlets = sanitizeOutlets(result.outlets, sourceText)
  const cities = unique((result.cities || []).filter((item) => evidenceMatches(sourceText, item)))
  const provinces = unique((result.provinces || []).filter((item) => evidenceMatches(sourceText, item)))
  const requestedScope = LOCATION_SCOPES.includes(result.locationScope) ? result.locationScope : 'unknown'
  const locationScope = requestedScope === 'outlet' && !outlets.length ? deterministic.locationScope : requestedScope
  const promotionConfidence = safeConfidence(result.promotionConfidence, 0.5)
  const explicitlyNotPromotion = result.isPromotion === false && promotionConfidence >= 0.8

  const benefitType = supportedValue(
    result,
    sourceText,
    'benefit',
    result.benefitType,
    fallbackFields.benefitType,
    (value) => BENEFIT_TYPES.includes(value) && value !== 'unknown' ? value : fallbackFields.benefitType,
  )

  return {
    isPromotion: !explicitlyNotPromotion,
    promotionConfidence,
    title: supportedValue(result, sourceText, 'title', result.normalizedTitle, fallbackFields.title, (value) => normalizeText(value).slice(0, 240) || fallbackFields.title),
    merchant: supportedValue(result, sourceText, 'merchant', result.merchant, fallbackFields.merchant, (value) => normalizeText(value).slice(0, 160) || fallbackFields.merchant),
    provider: supportedValue(result, sourceText, 'provider', result.provider, fallbackFields.provider, (value) => normalizeText(value).slice(0, 160) || fallbackFields.provider),
    benefitType,
    benefitValue: supportedValue(result, sourceText, 'benefit', result.benefitValue, fallbackFields.benefitValue, safeNumber),
    minimumSpend: supportedValue(result, sourceText, 'minimumSpend', result.minimumSpend, fallbackFields.minimumSpend, safeNumber),
    maximumBenefit: supportedValue(result, sourceText, 'maximumBenefit', result.maximumBenefit, fallbackFields.maximumBenefit, safeNumber),
    voucherCode: supportedValue(result, sourceText, 'voucherCode', result.voucherCode, fallbackFields.voucherCode, (value) => normalizeText(value).slice(0, 80) || null),
    startsAt: supportedValue(result, sourceText, 'startsAt', result.startsAt, fallbackFields.startsAt, (value) => normalizeDate(value)),
    expiresAt: supportedValue(result, sourceText, 'expiresAt', result.expiresAt, fallbackFields.expiresAt, (value) => normalizeDate(value, {endOfDay: true})),
    applicableDays: supportedValue(result, sourceText, 'applicableDays', result.applicableDays, fallbackFields.applicableDays || [], (value) => unique(value).map((item) => item.toLowerCase()).filter((item) => DAYS.includes(item))),
    paymentMethods: supportedValue(result, sourceText, 'paymentMethods', result.paymentMethods, fallbackFields.paymentMethods || [], unique),
    channels: supportedValue(result, sourceText, 'channels', result.channels, fallbackFields.channels || [], (value) => unique(value).filter((item) => CHANNELS.includes(item))),
    eligibility: supportedValue(result, sourceText, 'eligibility', result.eligibility, fallbackFields.eligibility || {}, () => ({
      newUserOnly: Boolean(result?.eligibility?.newUserOnly),
      existingUserOnly: Boolean(result?.eligibility?.existingUserOnly),
      cardTier: normalizeText(result?.eligibility?.cardTier),
      customerSegment: normalizeText(result?.eligibility?.customerSegment),
      otherRequirements: unique(result?.eligibility?.otherRequirements).slice(0, 20),
    })),
    eligibilitySummary: supportedValue(result, sourceText, 'eligibility', result.eligibilitySummary, '', (value) => normalizeText(value).slice(0, 500)),
    quotaText: supportedValue(result, sourceText, 'quota', result.quotaText, '', (value) => normalizeText(value).slice(0, 500)),
    primaryCategory,
    categories: categories.length ? categories : deterministic.categories,
    tags: unique([...(result.tags || []), ...deterministic.tags]).slice(0, 30),
    locationScope: locationScope !== 'unknown' ? locationScope : deterministic.locationScope,
    cities: unique([...cities, ...deterministic.cities]),
    provinces: unique([...provinces, ...deterministic.provinces]),
    outlets: mergeOutlets(outlets, deterministic.outlets),
    aiSummary: normalizeText(result.summary).slice(0, 1000),
    fieldConfidence,
    fieldEvidence,
    intelligenceWarnings: unique(result.warnings).slice(0, 30),
    contradictions: unique(result.contradictions).slice(0, 20),
  }
}

function averageConfidence(fieldConfidence, fallback) {
  const values = Object.values(fieldConfidence || {}).filter((value) => Number.isFinite(value) && value > 0)
  if (!values.length) return fallback
  return Math.max(0, Math.min(values.reduce((sum, value) => sum + value, 0) / values.length, 1))
}

function fullPromptVersion(config) {
  return `${config.promptVersion}:${PROMO_INTELLIGENCE_VERSION}`
}

function fullTaxonomyVersion(config) {
  return `${config.taxonomyVersion}:${PROMO_INTELLIGENCE_VERSION}`
}

export async function enrichPromoIntelligence(extracted, context = {}) {
  const config = getPromoLlmConfig()
  const fields = extracted?.extractedFields || {}
  const deterministic = deterministicSegmentation(extracted)
  const sourceText = normalizeText(extracted?.rawRelevantText || fields.termsText).slice(0, 18000)
  const trust = assessSourceTrust(context.source, extracted?.sourceUrl)

  if (!sourceText || !config.enabled) {
    const warnings = unique(extracted?.ambiguityWarnings)
    return {
      ...extracted,
      intelligence: {
        isPromotion: true,
        promotionConfidence: Number(extracted?.extractionConfidence || 0),
        summary: '',
        fieldConfidence: {},
        fieldEvidence: {},
        warnings,
        contradictions: [],
        sourceTrustLevel: trust.level,
        sourceTrustReasons: trust.reasons,
      },
      llmProcessing: {
        status: config.mode === 'rules_only' ? 'rules_only' : 'disabled',
        provider: config.provider,
        model: config.model,
        promptVersion: fullPromptVersion(config),
        taxonomyVersion: fullTaxonomyVersion(config),
      },
      extractedFields: {
        ...fields,
        ...deterministic,
        isPromotion: true,
        promotionConfidence: Number(extracted?.extractionConfidence || 0),
        aiSummary: '',
        quotaText: '',
        eligibilitySummary: '',
        fieldConfidence: {},
        fieldEvidence: {},
        intelligenceWarnings: warnings,
        contradictions: [],
        sourceTrustLevel: trust.level,
        sourceTrustReasons: trust.reasons,
        intelligenceMethod: 'rules',
      },
    }
  }

  const llmResponse = await runPromoLlmStructured({
    sb: context.sb,
    source: context.source,
    job: context.job,
    promotionId: context.promotionId || null,
    contentHash: `${PROMO_INTELLIGENCE_VERSION}:${extracted.contentHash}`,
    canonicalUrl: extracted.canonicalUrl,
    operation: 'full_promo_extraction',
    maxOutputTokens: 2000,
    systemInstruction: [
      'You are an Indonesian promotion intelligence extractor.',
      'Determine whether the supplied page is actually a consumer promotion or voucher offer.',
      'Extract every commercial term explicitly supported by the source text: validity dates, benefit, minimum spend, maximum benefit, voucher code, payment method, eligibility, applicable days, quota, channel, category, city, province, and named outlet.',
      'Use ISO date format YYYY-MM-DD. Never invent a missing date, amount, city, outlet, payment method, or eligibility rule.',
      'For each field, copy one exact supporting phrase from the source into evidence. Leave the value empty or null when the source does not support it.',
      'Do not treat article publication dates as promo validity dates unless the wording explicitly says so.',
      'Flag contradictions, unclear deadlines, ambiguous benefit mechanics, missing critical terms, and pages that merely mention promotions without containing a real offer.',
      'The application evaluates source authenticity separately; do not claim legal authenticity.',
      'Return only the requested structured JSON.',
    ].join(' '),
    input: JSON.stringify({
      source: {
        name: context.source?.name || null,
        type: context.source?.source_type || null,
        baseUrl: context.source?.base_url || null,
        pageUrl: extracted?.sourceUrl || null,
        pageTitle: extracted?.sourceTitle || null,
      },
      adapterDraft: {
        title: fields.title || null,
        merchant: fields.merchant || null,
        provider: fields.provider || null,
        paymentMethods: fields.paymentMethods || [],
        minimumSpend: fields.minimumSpend ?? null,
        benefitType: fields.benefitType || null,
        benefitValue: fields.benefitValue ?? null,
        maximumBenefit: fields.maximumBenefit ?? null,
        voucherCode: fields.voucherCode || null,
        startsAt: fields.startsAt || null,
        expiresAt: fields.expiresAt || null,
        applicableDays: fields.applicableDays || [],
        eligibility: fields.eligibility || {},
        channels: fields.channels || [],
      },
      sourceText,
    }),
    schema: PROMO_INTELLIGENCE_SCHEMA,
  })

  const ai = sanitizeAiResult(llmResponse.result, sourceText, fields, deterministic)
  const mergedFields = ai ? {
    ...fields,
    ...deterministic,
    ...ai,
    termsText: fields.termsText || sourceText,
    segmentationMethod: 'llm_hybrid',
    segmentationConfidence: ai.promotionConfidence,
    intelligenceMethod: llmResponse.status === 'cached' ? 'cache' : 'gemini',
    sourceTrustLevel: trust.level,
    sourceTrustReasons: trust.reasons,
  } : {
    ...fields,
    ...deterministic,
    isPromotion: true,
    promotionConfidence: Number(extracted?.extractionConfidence || 0),
    aiSummary: '',
    quotaText: '',
    eligibilitySummary: '',
    fieldConfidence: {},
    fieldEvidence: {},
    intelligenceWarnings: unique([...(extracted?.ambiguityWarnings || []), llmResponse.error || 'AI extraction unavailable']),
    contradictions: [],
    sourceTrustLevel: trust.level,
    sourceTrustReasons: trust.reasons,
    intelligenceMethod: 'rules',
  }

  const intelligence = {
    isPromotion: mergedFields.isPromotion !== false,
    promotionConfidence: Number(mergedFields.promotionConfidence || 0),
    summary: mergedFields.aiSummary || '',
    fieldConfidence: mergedFields.fieldConfidence || {},
    fieldEvidence: mergedFields.fieldEvidence || {},
    warnings: mergedFields.intelligenceWarnings || [],
    contradictions: mergedFields.contradictions || [],
    sourceTrustLevel: trust.level,
    sourceTrustReasons: trust.reasons,
  }

  return {
    ...extracted,
    extractionConfidence: ai
      ? Number(Math.max(Number(extracted?.extractionConfidence || 0), averageConfidence(ai.fieldConfidence, ai.promotionConfidence)).toFixed(3))
      : extracted.extractionConfidence,
    ambiguityWarnings: unique([...(extracted?.ambiguityWarnings || []), ...(intelligence.warnings || []), ...(intelligence.contradictions || [])]),
    intelligence,
    llmProcessing: {
      status: ai ? llmResponse.status : (llmResponse.status || 'failed'),
      provider: llmResponse.provider || config.provider,
      model: llmResponse.model || config.model,
      error: llmResponse.error || null,
      estimatedCostUsd: Number(llmResponse.estimatedCostUsd || 0),
      inputTokens: Number(llmResponse.inputTokens || 0),
      outputTokens: Number(llmResponse.outputTokens || 0),
      responseId: llmResponse.responseId || null,
      promptVersion: fullPromptVersion(config),
      taxonomyVersion: fullTaxonomyVersion(config),
    },
    extractedFields: mergedFields,
  }
}
