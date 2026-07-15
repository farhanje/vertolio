import { deterministicSegmentation } from './segmentation'
import { evaluatePublishability } from './publishability'

function unique(values) {
  return [...new Set((values || []).filter(Boolean))]
}

function sourceTrust(source, sourceUrl) {
  try {
    const base = new URL(source?.base_url)
    const page = new URL(sourceUrl)
    const sameHost = page.hostname === base.hostname || page.hostname.endsWith(`.${base.hostname}`)
    if (page.protocol !== 'https:') return {level: 'suspicious', reasons: ['Source page does not use HTTPS']}
    if (!sameHost) return {level: 'unverified', reasons: ['Promotion URL is outside the registered source domain']}
    if (source?.source_type === 'trusted_aggregator') {
      return {level: 'trusted_aggregator', reasons: ['Registered trusted promotion aggregator domain']}
    }
    return {level: 'official_source', reasons: ['Promotion URL matches the registered source domain']}
  } catch (_) {
    return {level: 'suspicious', reasons: ['Source URL could not be validated']}
  }
}

function evidenceLine(text, pattern) {
  return String(text || '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .find((line) => line && pattern.test(line)) || ''
}

function deterministicEvidence(fields, text, publishability) {
  const evidence = {}
  const confidence = {}
  const title = fields.title || ''
  if (title) {
    evidence.title = title
    confidence.title = 1
  }
  if (fields.merchant) {
    evidence.merchant = fields.merchant
    confidence.merchant = 0.98
  }
  if (publishability.offerSummary) {
    evidence.benefit = evidenceLine(text, /dapatkan|diskon|discount|cashback|potongan|harga spesial|gratis|bonus|ekstra|extra|reward|voucher/i)
      || title
    confidence.benefit = evidence.benefit ? 0.9 : 0
  }
  if (fields.expiresAt) {
    evidence.expiresAt = evidenceLine(text, /berlaku hingga|periode promo|valid until|berakhir|sampai|hingga/i)
    confidence.expiresAt = evidence.expiresAt ? 0.95 : 0.7
  }
  if (fields.minimumSpend !== null && fields.minimumSpend !== undefined) {
    evidence.minimumSpend = evidenceLine(text, /minimum|minimal|min\.?\s*spend/i)
    confidence.minimumSpend = evidence.minimumSpend ? 0.95 : 0.7
  }
  if (Array.isArray(fields.paymentMethods) && fields.paymentMethods.length) {
    evidence.paymentMethods = evidenceLine(text, /qris|mybca|bca mobile|virtual account|klikbca|atm bca|kartu kredit|kartu debit|sakuku|paylater|reward bca|nfc pay/i)
    confidence.paymentMethods = evidence.paymentMethods ? 0.95 : 0.7
  }
  const locationEvidence = evidenceLine(text, /berlaku di|tersedia di|seluruh outlet|semua outlet|online|website|aplikasi|mall|plaza|cabang|gerai|lokasi/i)
  if (locationEvidence) {
    evidence.locations = locationEvidence
    confidence.locations = 0.9
  }
  return {evidence, confidence}
}

function authoritativeSegmentation(fields, fallback) {
  if (fields.sourceMappingAuthority !== 'source_adapter') return fallback
  return {
    ...fallback,
    primaryCategory: fields.primaryCategory || fallback.primaryCategory,
    categories: fields.categories?.length ? fields.categories : fallback.categories,
    tags: unique([...(fallback.tags || []), ...(fields.tags || [])]),
    locationScope: fields.locationScope || fallback.locationScope,
    cities: Array.isArray(fields.cities) ? fields.cities : fallback.cities,
    provinces: Array.isArray(fields.provinces) ? fields.provinces : fallback.provinces,
    outlets: Array.isArray(fields.outlets) ? fields.outlets : fallback.outlets,
    segmentationMethod: 'source_rules',
    segmentationConfidence: 0.96,
  }
}

export function enrichPromoDeterministically(extracted, context = {}) {
  const source = context.source || {}
  const fields = extracted?.extractedFields || {}
  const inferredSegmentation = deterministicSegmentation(extracted)
  const segmentation = authoritativeSegmentation(fields, inferredSegmentation)
  const trust = sourceTrust(source, extracted?.sourceUrl)
  const firstPass = {
    ...extracted,
    extractedFields: {
      ...fields,
      ...segmentation,
      channels: fields.sourceMappingAuthority === 'source_adapter'
        ? (fields.channels || [])
        : (fields.channels?.length ? fields.channels : []),
      sourceTrustLevel: trust.level,
      sourceTrustReasons: trust.reasons,
      intelligenceMethod: 'rules',
      segmentationMethod: segmentation.segmentationMethod || 'rules',
    },
  }
  const publishability = evaluatePublishability(firstPass, source)
  const text = extracted?.rawRelevantText || fields.termsText || ''
  const deterministic = deterministicEvidence(firstPass.extractedFields, text, publishability)
  const mergedFields = {
    ...firstPass.extractedFields,
    offerSummary: publishability.offerSummary,
    requirementsSummary: publishability.requirementsSummary,
    promotionConfidence: Math.max(Number(extracted?.extractionConfidence || 0), publishability.score),
    fieldEvidence: {...(fields.fieldEvidence || {}), ...deterministic.evidence},
    fieldConfidence: {...(fields.fieldConfidence || {}), ...deterministic.confidence},
    intelligenceWarnings: unique(extracted?.ambiguityWarnings),
    contradictions: fields.contradictions || [],
    aiSummary: fields.aiSummary || '',
    quotaText: fields.quotaText || '',
    eligibilitySummary: fields.eligibilitySummary || '',
  }

  return {
    ...extracted,
    extractionConfidence: Number(Math.max(Number(extracted?.extractionConfidence || 0), publishability.score).toFixed(3)),
    publishability,
    intelligence: {
      isPromotion: true,
      promotionConfidence: mergedFields.promotionConfidence,
      summary: '',
      fieldConfidence: mergedFields.fieldConfidence,
      fieldEvidence: mergedFields.fieldEvidence,
      warnings: mergedFields.intelligenceWarnings,
      contradictions: mergedFields.contradictions,
      sourceTrustLevel: trust.level,
      sourceTrustReasons: trust.reasons,
      publishability,
    },
    llmProcessing: {
      status: publishability.resolvableFields.length ? 'queued' : 'not_needed',
      provider: null,
      model: null,
      promptVersion: null,
      taxonomyVersion: null,
    },
    extractedFields: mergedFields,
  }
}
