import { calculatePromotionValue } from '../calculations'
import { detectMaterialChanges } from '../change-detection'
import { getPromoLlmConfig } from '../llm'
import { enrichExtractedPromotion } from '../segmentation'
import { shouldAutoPublish, validateExtractedPromotion } from '../validation'

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
}

function promotionPayload(source, extracted, calculatedValues, publicationStatus) {
  const fields = extracted.extractedFields
  const now = new Date().toISOString()
  const outlets = Array.isArray(fields.outlets) ? fields.outlets : []
  const llm = extracted.llmProcessing || {}
  const llmStatus = llm.status || 'rules_only'
  const attemptedLlmStatuses = new Set([
    'success',
    'cached',
    'failed',
    'skipped_budget',
    'skipped_daily_limit',
    'not_needed',
  ])

  return {
    source_id: source.id,
    canonical_url: extracted.canonicalUrl,
    source_url: extracted.sourceUrl,
    title: fields.title,
    merchant: fields.merchant || null,
    provider: fields.provider || source.name,
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
    segmentation_llm_status: llmStatus,
    segmentation_last_attempt_at: attemptedLlmStatuses.has(llmStatus) ? now : null,
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
    ...(extracted.extractionConfidence < 0.85 ? ['low_extraction_confidence'] : []),
  ])]

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

async function storeDocument(sb, source, job, extracted) {
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
    ambiguity_warnings: extracted.ambiguityWarnings,
    extraction_confidence: extracted.extractionConfidence,
    fetched_at: extracted.fetchedAt,
    http_status: extracted.httpStatus,
    response_headers: extracted.responseHeaders,
    document_status: 'extracted',
  }

  const {data, error} = await sb
    .from('promo_documents')
    .upsert(payload, {
      onConflict: 'source_id,canonical_url,content_hash',
      ignoreDuplicates: false,
    })
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

function llmOutcome(extracted, fallback = 'rules_only') {
  return extracted?.llmProcessing?.status || fallback
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
  const rawCalculated = calculatePromotionValue(rawExtracted.extractedFields)

  if (rawCalculated.expiryStatus === 'expired') {
    if (existing) {
      await deletePromotion(sb, existing.id)
      return {result: 'deleted', review: false, materialChange: true, llmStatus: 'skipped_expired'}
    }
    return {result: 'expiredSkipped', review: false, materialChange: false, llmStatus: 'skipped_expired'}
  }

  const llmConfig = getPromoLlmConfig()
  const sameHash = existing?.content_hash === rawExtracted.contentHash
  const signatureMatches = Boolean(existing)
    && existing.segmentation_provider === llmConfig.provider
    && existing.segmentation_model === llmConfig.model
    && existing.segmentation_prompt_version === llmConfig.promptVersion
    && existing.segmentation_taxonomy_version === llmConfig.taxonomyVersion
  const priorStatusSatisfied = signatureMatches
    && ['success', 'cached', 'not_needed'].includes(existing?.segmentation_llm_status)
  const lastAttemptAt = existing?.segmentation_last_attempt_at
    ? new Date(existing.segmentation_last_attempt_at).getTime()
    : 0
  const recentAttempt = signatureMatches
    && Number.isFinite(lastAttemptAt)
    && lastAttemptAt > 0
    && Date.now() - lastAttemptAt < 24 * 60 * 60 * 1000
  const needsLlmRefresh = sameHash
    && llmConfig.enabled
    && !priorStatusSatisfied
    && !recentAttempt

  if (sameHash && !needsLlmRefresh) {
    const {error} = await sb
      .from('promotions')
      .update({
        last_seen_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) throw error
    return {result: 'unchanged', review: false, materialChange: false, llmStatus: 'skipped_unchanged'}
  }

  const extracted = await enrichExtractedPromotion(rawExtracted, {
    sb,
    source,
    job,
    promotionId: existing?.id || null,
  })
  const validation = validateExtractedPromotion(extracted)
  const document = await storeDocument(sb, source, job, extracted)
  const calculated = calculatePromotionValue(extracted.extractedFields)
  const autoPublish = shouldAutoPublish({source, extracted, validation})
  const publicationStatus = autoPublish ? 'published' : 'review'
  const currentLlmStatus = llmOutcome(extracted)

  if (!existing) {
    const payload = promotionPayload(source, extracted, calculated, publicationStatus)
    const {data: created, error} = await sb.from('promotions').insert(payload).select('*').single()
    if (error) throw error
    await syncPromotionOutlets(sb, created.id, extracted.extractedFields.outlets || [])

    const versionNumber = await nextVersionNumber(sb, created.id)
    const {error: versionError} = await sb.from('promotion_versions').insert({
      promotion_id: created.id,
      document_id: document.id,
      version_number: versionNumber,
      snapshot: extracted.extractedFields,
      material_changes: [],
      is_material: true,
    })
    if (versionError) throw versionError

    if (!autoPublish) {
      await addReviewItem(sb, {
        documentId: document.id,
        promotionId: created.id,
        validation,
        extracted,
      })
    }

    return {result: 'created', review: !autoPublish, materialChange: true, llmStatus: currentLlmStatus}
  }

  const existingOutlets = await readPromotionOutlets(sb, existing.id)
  const previousFields = {
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
    outlets: existingOutlets,
  }

  const changes = detectMaterialChanges(previousFields, extracted.extractedFields)
  const payload = promotionPayload(source, extracted, calculated, autoPublish ? 'published' : 'review')
  if (!changes.length) {
    delete payload.publication_status
    delete payload.published_at
  }

  const {error: updateError} = await sb.from('promotions').update(payload).eq('id', existing.id)
  if (updateError) throw updateError
  await syncPromotionOutlets(sb, existing.id, extracted.extractedFields.outlets || [])

  const versionNumber = await nextVersionNumber(sb, existing.id)
  const {error: versionError} = await sb.from('promotion_versions').insert({
    promotion_id: existing.id,
    document_id: document.id,
    version_number: versionNumber,
    snapshot: extracted.extractedFields,
    material_changes: changes,
    is_material: changes.length > 0,
  })
  if (versionError) throw versionError

  if (!autoPublish || changes.length) {
    const changeReasons = changes.map((change) => `material_change:${MATERIAL_FIELD_MAP[change.field] || change.field}`)
    await addReviewItem(sb, {
      documentId: document.id,
      promotionId: existing.id,
      validation: {
        errors: validation.errors,
        warnings: [...validation.warnings, ...changeReasons],
      },
      extracted,
    })
  }

  return {
    result: 'updated',
    review: !autoPublish || changes.length > 0,
    materialChange: changes.length > 0,
    llmStatus: currentLlmStatus,
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
