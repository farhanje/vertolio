import { sha256Hex } from '../../promo-sources/base-adapter'
import { calculatePromotionValue } from '../calculations'
import { detectMaterialChanges } from '../change-detection'
import { enrichPromoDeterministically } from '../deterministic-intelligence'
import { validateExtractedPromotion } from '../validation'

const MATERIAL_FIELD_MAP = {
  minimumSpend: 'minimum_spend',
  benefitType: 'benefit_type',
  benefitValue: 'benefit_value',
  maximumBenefit: 'maximum_benefit',
  startsAt: 'starts_at',
  expiresAt: 'expires_at',
  paymentMethods: 'payment_methods',
  voucherCode: 'voucher_code',
  applicableDays: 'applicable_days',
  eligibility: 'eligibility',
  channels: 'channels',
  primaryCategory: 'primary_category',
  categories: 'categories',
  tags: 'tags',
  locationScope: 'location_scope',
  cities: 'cities',
  provinces: 'provinces',
  outlets: 'promo_outlets',
  quotaText: 'quota_text',
  eligibilitySummary: 'eligibility_summary',
}

function normalizeIdentity(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function dateOnly(value) {
  if (!value) return ''
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

function buildDuplicateFingerprint(fields) {
  const merchant = normalizeIdentity(fields.merchant || fields.title)
  const offer = normalizeIdentity(fields.offerSummary || fields.title)
  const benefitIdentity = [
    fields.benefitType || '',
    Number(fields.benefitValue || 0),
    Number(fields.minimumSpend || 0),
    Number(fields.maximumBenefit || 0),
    normalizeIdentity(fields.voucherCode),
    offer,
  ].join('|')

  if (!merchant || !offer) return null
  return sha256Hex([
    merchant,
    benefitIdentity,
    dateOnly(fields.startsAt),
    dateOnly(fields.expiresAt),
    fields.primaryCategory || 'other',
  ].join('|'))
}

function publicationAllowed(source, extracted, verification) {
  const fields = extracted.extractedFields || {}
  const threshold = Number(source.minimum_confidence || 0.85)
  return verification === 'verified'
    && source.auto_publish_enabled
    && ['official_source', 'trusted_aggregator'].includes(fields.sourceTrustLevel)
    && Number(extracted.extractionConfidence || 0) >= threshold
    && extracted.publishability?.status === 'publishable'
}

function promotionPayload(source, extracted, calculatedValues, publicationStatus, verificationStatus, duplicateFingerprint, duplicateOf) {
  const fields = extracted.extractedFields
  const now = new Date().toISOString()
  const outlets = Array.isArray(fields.outlets) ? fields.outlets : []
  const llm = extracted.llmProcessing || {}
  const publishability = extracted.publishability || {}

  return {
    source_id: source.id,
    canonical_url: extracted.canonicalUrl,
    source_url: extracted.sourceUrl,
    title: fields.title,
    merchant: fields.merchant || null,
    provider: fields.provider || source.name,
    offer_summary: fields.offerSummary || null,
    requirements_summary: fields.requirementsSummary || null,
    payment_methods: fields.paymentMethods || [],
    minimum_spend: fields.minimumSpend,
    benefit_type: fields.benefitType,
    benefit_value: fields.benefitValue,
    maximum_benefit: fields.maximumBenefit,
    voucher_code: fields.voucherCode,
    starts_at: fields.startsAt,
    expires_at: fields.expiresAt,
    applicable_days: fields.applicableDays || [],
    eligibility: fields.eligibility || {},
    channels: fields.channels || [],
    terms_text: fields.termsText,
    primary_category: fields.primaryCategory || 'other',
    categories: fields.categories?.length ? fields.categories : ['other'],
    tags: fields.tags || [],
    location_scope: fields.locationScope || 'unknown',
    cities: fields.cities || [],
    provinces: fields.provinces || [],
    outlet_count: outlets.length,
    segmentation_method: fields.segmentationMethod || 'rules',
    segmentation_confidence: Number(fields.segmentationConfidence || 0),
    segmentation_provider: llm.provider || null,
    segmentation_model: llm.model || null,
    segmentation_prompt_version: llm.promptVersion || null,
    segmentation_taxonomy_version: llm.taxonomyVersion || null,
    segmentation_llm_status: llm.status || 'not_needed',
    segmentation_last_attempt_at: ['success','cached','failed','skipped_budget','skipped_daily_limit'].includes(llm.status)
      ? now
      : null,
    is_promotion: fields.isPromotion !== false,
    promotion_confidence: Number(fields.promotionConfidence || 0),
    ai_summary: fields.aiSummary || null,
    quota_text: fields.quotaText || null,
    eligibility_summary: fields.eligibilitySummary || null,
    field_confidence: fields.fieldConfidence || {},
    field_evidence: fields.fieldEvidence || {},
    intelligence_warnings: fields.intelligenceWarnings || [],
    contradictions: fields.contradictions || [],
    source_trust_level: fields.sourceTrustLevel || 'unverified',
    source_trust_reasons: fields.sourceTrustReasons || [],
    verification_status: verificationStatus,
    duplicate_fingerprint: duplicateFingerprint,
    duplicate_of: duplicateOf || null,
    intelligence_method: fields.intelligenceMethod || 'rules',
    publishability_status: publishability.status || 'unresolved',
    publishability_score: Number(publishability.score || 0),
    publishability_missing: publishability.missingFields || [],
    boundary_status: extracted.boundaryDiagnostics?.status || 'unknown',
    boundary_diagnostics: extracted.boundaryDiagnostics || {},
    calculated_values: calculatedValues,
    status: calculatedValues.expiryStatus === 'expiring_soon'
      ? 'expiring_soon'
      : fields.startsAt && new Date(fields.startsAt) > new Date()
        ? 'upcoming'
        : 'active',
    publication_status: publicationStatus,
    extraction_confidence: extracted.extractionConfidence,
    content_hash: extracted.contentHash,
    last_seen_at: now,
    last_verified_at: now,
    published_at: publicationStatus === 'published' ? now : null,
  }
}

async function addReviewItem(sb, {documentId, promotionId, validation, extracted}) {
  const reasons = [...new Set([
    ...validation.errors,
    ...validation.warnings,
    ...(extracted.publishability?.missingFields || []).map((field) => `publishability:${field}`),
    ...(extracted.extractionConfidence < 0.7 ? ['low_extraction_confidence'] : []),
  ])]
  if (!reasons.length) return

  const {error} = await sb.from('promo_review_queue').insert({
    document_id: documentId,
    promotion_id: promotionId || null,
    reasons,
    suggested_fields: extracted.extractedFields,
  })
  if (error && !String(error.message || '').includes('duplicate')) throw error
}

async function nextVersionNumber(sb, promotionId) {
  const {data, error} = await sb
    .from('promotion_versions')
    .select('version_number')
    .eq('promotion_id', promotionId)
    .order('version_number', {ascending: false})
    .limit(1)
  if (error) throw error
  return (data?.[0]?.version_number || 0) + 1
}

async function storeDocument(sb, source, job, extracted, documentStatus = 'extracted') {
  const payload = {
    source_id: source.id,
    job_id: job.id,
    source_url: extracted.sourceUrl,
    canonical_url: extracted.canonicalUrl,
    source_title: extracted.sourceTitle,
    raw_relevant_text: extracted.rawRelevantText,
    content_hash: extracted.contentHash,
    publication_date: extracted.publicationDate,
    extracted_fields: extracted.extractedFields,
    intelligence_result: extracted.intelligence || {},
    ambiguity_warnings: extracted.ambiguityWarnings,
    extraction_confidence: extracted.extractionConfidence,
    fetched_at: extracted.fetchedAt,
    http_status: extracted.httpStatus,
    response_headers: extracted.responseHeaders,
    boundary_status: extracted.boundaryDiagnostics?.status || 'unknown',
    boundary_diagnostics: extracted.boundaryDiagnostics || {},
    document_status: documentStatus,
  }

  const {data, error} = await sb
    .from('promo_documents')
    .upsert(payload, {onConflict: 'source_id,canonical_url,content_hash', ignoreDuplicates: false})
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function readPromotionOutlets(sb, promotionId) {
  const {data, error} = await sb
    .from('promo_outlets')
    .select('outlet_name,address,city,province,postal_code,source_text')
    .eq('promotion_id', promotionId)
    .order('outlet_name')
  if (error) throw error
  return (data || []).map((item) => ({
    outletName: item.outlet_name,
    address: item.address,
    city: item.city,
    province: item.province,
    postalCode: item.postal_code,
    sourceText: item.source_text,
  }))
}

async function syncPromotionOutlets(sb, promotionId, outlets = []) {
  const removed = await sb.from('promo_outlets').delete().eq('promotion_id', promotionId)
  if (removed.error) throw removed.error
  if (!outlets.length) return
  const payload = outlets.map((item) => ({
    promotion_id: promotionId,
    outlet_name: item.outletName,
    address: item.address || null,
    city: item.city || null,
    province: item.province || null,
    postal_code: item.postalCode || null,
    source_text: item.sourceText || null,
  }))
  const inserted = await sb.from('promo_outlets').insert(payload)
  if (inserted.error) throw inserted.error
}

async function deletePromotion(sb, promotionId) {
  const reviews = await sb.from('promo_review_queue').delete().eq('promotion_id', promotionId)
  if (reviews.error) throw reviews.error
  const deleted = await sb.from('promotions').delete().eq('id', promotionId)
  if (deleted.error) throw deleted.error
}

async function findDuplicate(sb, fingerprint, existingId = null) {
  if (!fingerprint) return null
  let query = sb
    .from('promotions')
    .select('id,title,source_id,source_trust_level')
    .eq('duplicate_fingerprint', fingerprint)
    .is('duplicate_of', null)
    .limit(1)
  if (existingId) query = query.neq('id', existingId)
  const result = await query.maybeSingle()
  if (result.error) throw result.error
  return result.data || null
}

function verificationStatus(fields, validation, duplicate, publishability) {
  if (duplicate) return 'duplicate'
  if (publishability.status === 'catalog_listing') return 'catalog_listing'
  if (
    publishability.status === 'publishable'
    && validation.valid
    && !(fields.contradictions || []).length
    && !['unverified', 'suspicious'].includes(fields.sourceTrustLevel)
  ) return 'verified'
  return 'needs_attention'
}

function previousFields(existing, outlets) {
  return {
    minimumSpend: existing.minimum_spend,
    benefitType: existing.benefit_type,
    benefitValue: existing.benefit_value,
    maximumBenefit: existing.maximum_benefit,
    startsAt: existing.starts_at,
    expiresAt: existing.expires_at,
    paymentMethods: existing.payment_methods,
    voucherCode: existing.voucher_code,
    applicableDays: existing.applicable_days,
    eligibility: existing.eligibility,
    channels: existing.channels,
    primaryCategory: existing.primary_category,
    categories: existing.categories,
    tags: existing.tags,
    locationScope: existing.location_scope,
    cities: existing.cities,
    provinces: existing.provinces,
    outlets,
    quotaText: existing.quota_text,
    eligibilitySummary: existing.eligibility_summary,
    offerSummary: existing.offer_summary,
  }
}

async function reconcileAiQueue(sb, {promotionId, documentId, sourceId, contentHash, publishability}) {
  const stale = await sb
    .from('promo_ai_resolution_queue')
    .update({status: 'cancelled'})
    .eq('promotion_id', promotionId)
    .in('status', ['queued','running'])
    .neq('content_hash', contentHash)
  if (stale.error) throw stale.error

  if (publishability.status !== 'unresolved' || !publishability.resolvableFields.length) {
    const cancelled = await sb
      .from('promo_ai_resolution_queue')
      .update({status: 'cancelled'})
      .eq('promotion_id', promotionId)
      .eq('content_hash', contentHash)
      .in('status', ['queued','running'])
    if (cancelled.error) throw cancelled.error
    return false
  }

  const existing = await sb
    .from('promo_ai_resolution_queue')
    .select('id,status')
    .eq('promotion_id', promotionId)
    .eq('content_hash', contentHash)
    .maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) return existing.data.status === 'queued' || existing.data.status === 'running'

  const inserted = await sb.from('promo_ai_resolution_queue').insert({
    promotion_id: promotionId,
    document_id: documentId,
    source_id: sourceId,
    content_hash: contentHash,
    missing_fields: publishability.resolvableFields,
    status: 'queued',
    next_attempt_at: new Date().toISOString(),
  })
  if (inserted.error && inserted.error.code !== '23505') throw inserted.error
  return true
}

function needsLegacyRefresh(existing, sameHash) {
  if (!sameHash || !existing) return false
  return existing.boundary_status === 'unknown'
    || existing.publishability_status === 'unresolved'
    || (existing.publishability_missing || []).includes('legacy_reassessment_required')
}

export async function processExtractedPromotion(sb, source, job, rawExtracted) {
  const existingResult = await sb
    .from('promotions')
    .select('*')
    .eq('source_id', source.id)
    .eq('canonical_url', rawExtracted.canonicalUrl)
    .maybeSingle()
  if (existingResult.error) throw existingResult.error
  const existing = existingResult.data
  const sameHash = existing?.content_hash === rawExtracted.contentHash

  if (sameHash && !needsLegacyRefresh(existing, sameHash)) {
    const {error} = await sb
      .from('promotions')
      .update({last_seen_at: new Date().toISOString(), last_verified_at: new Date().toISOString()})
      .eq('id', existing.id)
    if (error) throw error
    return {result: 'unchanged', review: false, materialChange: false, llmStatus: 'skipped_unchanged', aiQueued: false}
  }

  const extracted = enrichPromoDeterministically(rawExtracted, {source, job, promotionId: existing?.id || null})
  const currentLlmStatus = extracted.llmProcessing?.status || 'not_needed'

  if (extracted.extractedFields.isPromotion === false) {
    await storeDocument(sb, source, job, extracted, 'quarantined')
    if (existing) await deletePromotion(sb, existing.id)
    return {result: 'notPromotion', review: false, materialChange: Boolean(existing), llmStatus: currentLlmStatus, notPromotion: true, aiEnriched: false, aiQueued: false}
  }

  const validation = validateExtractedPromotion(extracted)
  const document = await storeDocument(sb, source, job, extracted)
  const calculated = calculatePromotionValue(extracted.extractedFields)

  if (calculated.expiryStatus === 'expired') {
    if (existing) {
      await deletePromotion(sb, existing.id)
      return {result: 'deleted', review: false, materialChange: true, llmStatus: currentLlmStatus, aiEnriched: false, aiQueued: false}
    }
    return {result: 'expiredSkipped', review: false, materialChange: false, llmStatus: currentLlmStatus, aiEnriched: false, aiQueued: false}
  }

  const duplicateFingerprint = buildDuplicateFingerprint(extracted.extractedFields)
  const duplicate = await findDuplicate(sb, duplicateFingerprint, existing?.id || null)
  const verification = verificationStatus(extracted.extractedFields, validation, duplicate, extracted.publishability)
  const autoPublish = publicationAllowed(source, extracted, verification)
  const publicationStatus = duplicate ? 'draft' : (autoPublish ? 'published' : 'review')
  const payload = promotionPayload(source, extracted, calculated, publicationStatus, verification, duplicateFingerprint, duplicate?.id || null)
  let promotion
  let changes = []

  if (!existing) {
    const created = await sb.from('promotions').insert(payload).select('*').single()
    if (created.error) throw created.error
    promotion = created.data
    await syncPromotionOutlets(sb, promotion.id, extracted.extractedFields.outlets || [])
    const versionNumber = await nextVersionNumber(sb, promotion.id)
    const version = await sb.from('promotion_versions').insert({
      promotion_id: promotion.id,
      document_id: document.id,
      version_number: versionNumber,
      snapshot: extracted.extractedFields,
      material_changes: [],
      is_material: true,
    })
    if (version.error) throw version.error
  } else {
    promotion = existing
    const existingOutlets = await readPromotionOutlets(sb, existing.id)
    changes = detectMaterialChanges(previousFields(existing, existingOutlets), extracted.extractedFields)
    if (!changes.length && verification === existing.verification_status) {
      delete payload.publication_status
      delete payload.published_at
    }
    const updated = await sb.from('promotions').update(payload).eq('id', existing.id).select('*').single()
    if (updated.error) throw updated.error
    promotion = updated.data
    await syncPromotionOutlets(sb, existing.id, extracted.extractedFields.outlets || [])
    const versionNumber = await nextVersionNumber(sb, existing.id)
    const version = await sb.from('promotion_versions').insert({
      promotion_id: existing.id,
      document_id: document.id,
      version_number: versionNumber,
      snapshot: extracted.extractedFields,
      material_changes: changes,
      is_material: changes.length > 0,
    })
    if (version.error) throw version.error
  }

  const aiQueued = await reconcileAiQueue(sb, {
    promotionId: promotion.id,
    documentId: document.id,
    sourceId: source.id,
    contentHash: extracted.contentHash,
    publishability: extracted.publishability,
  })

  const shouldReviewNow = verification === 'needs_attention'
    && (!extracted.publishability.resolvableFields.length || !aiQueued)
  if (shouldReviewNow) {
    const changeReasons = changes.map((change) => `material_change:${MATERIAL_FIELD_MAP[change.field] || change.field}`)
    await addReviewItem(sb, {
      documentId: document.id,
      promotionId: promotion.id,
      validation: {errors: validation.errors, warnings: [...validation.warnings, ...changeReasons]},
      extracted,
    })
  }

  return {
    result: existing ? 'updated' : 'created',
    review: shouldReviewNow,
    materialChange: existing ? changes.length > 0 : true,
    llmStatus: currentLlmStatus,
    duplicate: Boolean(duplicate),
    needsAttention: verification === 'needs_attention',
    aiEnriched: false,
    aiQueued,
  }
}

export function incrementLlmCounter(counters, status) {
  if (status === 'success') counters.llmCalled += 1
  else if (status === 'cached') counters.llmCached += 1
  else if (['skipped_budget', 'skipped_daily_limit'].includes(status)) counters.llmBudgetSkipped += 1
  else if (status === 'failed') counters.llmFailed += 1
  else if (status === 'skipped_unchanged') counters.llmSkippedUnchanged += 1
  else counters.rulesOnly += 1
}
