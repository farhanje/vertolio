import { supabaseServer } from '@/lib/supabase.server'
import { getPromotionSourceAdapter } from '@/lib/promo-sources/registry'
import { calculatePromotionValue } from './calculations'
import { detectMaterialChanges } from './change-detection'
import { computeNextRunAt, retryDelayMinutes, sourceHealthForFailures } from './schedule'
import { shouldAutoPublish, validateExtractedPromotion } from './validation'

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
}

function logEntry(level, message, meta = {}) {
  return {
    at: new Date().toISOString(),
    level,
    message,
    ...meta,
  }
}

function promotionPayload(source, extracted, calculatedValues, publicationStatus) {
  const fields = extracted.extractedFields
  const now = new Date().toISOString()

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
    calculated_values: calculatedValues,
    status: calculatedValues.expiryStatus === 'expired'
      ? 'expired'
      : calculatedValues.expiryStatus === 'expiring_soon'
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

async function addReviewItem(sb, { documentId, promotionId, validation, extracted }) {
  const reasons = [...new Set([
    ...validation.errors,
    ...validation.warnings,
    ...(extracted.extractionConfidence < 0.85 ? ['low_extraction_confidence'] : []),
  ])]

  const { error } = await sb.from('promo_review_queue').insert({
    document_id: documentId,
    promotion_id: promotionId || null,
    reasons,
    suggested_fields: extracted.extractedFields,
  })

  if (error && !String(error.message || '').includes('duplicate')) throw error
}

async function nextVersionNumber(sb, promotionId) {
  const { data, error } = await sb
    .from('promotion_versions')
    .select('version_number')
    .eq('promotion_id', promotionId)
    .order('version_number', { ascending: false })
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

  const { data, error } = await sb
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

async function processExtractedPromotion(sb, source, job, extracted) {
  const validation = validateExtractedPromotion(extracted)
  const document = await storeDocument(sb, source, job, extracted)
  const calculated = calculatePromotionValue(extracted.extractedFields)
  const autoPublish = shouldAutoPublish({ source, extracted, validation })
  const publicationStatus = autoPublish ? 'published' : 'review'

  const existingResult = await sb
    .from('promotions')
    .select('*')
    .eq('source_id', source.id)
    .eq('canonical_url', extracted.canonicalUrl)
    .maybeSingle()

  if (existingResult.error) throw existingResult.error
  const existing = existingResult.data

  if (!existing) {
    const payload = promotionPayload(source, extracted, calculated, publicationStatus)
    const { data: created, error } = await sb.from('promotions').insert(payload).select('*').single()
    if (error) throw error

    const versionNumber = await nextVersionNumber(sb, created.id)
    const { error: versionError } = await sb.from('promotion_versions').insert({
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

    return { result: 'created', review: !autoPublish, materialChange: true }
  }

  if (existing.content_hash === extracted.contentHash) {
    const { error } = await sb
      .from('promotions')
      .update({
        last_seen_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) throw error
    return { result: 'unchanged', review: false, materialChange: false }
  }

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
  }

  const changes = detectMaterialChanges(previousFields, extracted.extractedFields)
  const payload = promotionPayload(source, extracted, calculated, autoPublish ? 'published' : 'review')

  if (!changes.length) {
    delete payload.publication_status
    delete payload.published_at
  }

  const { error: updateError } = await sb.from('promotions').update(payload).eq('id', existing.id)
  if (updateError) throw updateError

  const versionNumber = await nextVersionNumber(sb, existing.id)
  const { error: versionError } = await sb.from('promotion_versions').insert({
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
  }
}

async function completeJob(sb, job, source, counters, logs, startedAt) {
  const completedAt = new Date()
  const durationMs = completedAt.getTime() - startedAt.getTime()
  const previousAverage = Number(source.average_execution_ms || 0)
  const averageExecutionMs = previousAverage
    ? Math.round(previousAverage * 0.7 + durationMs * 0.3)
    : durationMs

  const nextRunAt = computeNextRunAt(source, completedAt)
  const status = counters.warnings > 0 ? 'completed_with_warnings' : 'completed'

  const { error: jobError } = await sb
    .from('promo_ingestion_jobs')
    .update({
      status,
      completed_at: completedAt.toISOString(),
      records_discovered: counters.discovered,
      records_created: counters.created,
      records_updated: counters.updated,
      records_unchanged: counters.unchanged,
      records_requiring_review: counters.review,
      execution_logs: logs,
      duration_ms: durationMs,
    })
    .eq('id', job.id)

  if (jobError) throw jobError

  const { error: sourceError } = await sb
    .from('promo_sources')
    .update({
      status: 'healthy',
      consecutive_failure_count: 0,
      average_execution_ms: averageExecutionMs,
      last_success_at: completedAt.toISOString(),
      last_content_change_at: counters.materialChanges > 0
        ? completedAt.toISOString()
        : source.last_content_change_at,
      next_run_at: nextRunAt,
      locked_until: null,
    })
    .eq('id', source.id)

  if (sourceError) throw sourceError
}

async function failJob(sb, job, source, error, logs, startedAt) {
  const completedAt = new Date()
  const durationMs = completedAt.getTime() - startedAt.getTime()
  const attempt = Number(job.attempt_number || 1)
  const failures = Number(source.consecutive_failure_count || 0) + 1
  const canRetry = attempt < 4
  const retryAt = canRetry
    ? new Date(completedAt.getTime() + retryDelayMinutes(attempt) * 60 * 1000).toISOString()
    : null

  logs.push(logEntry('error', String(error?.message || error)))

  const jobUpdate = await sb
    .from('promo_ingestion_jobs')
    .update({
      status: canRetry ? 'retrying' : 'failed',
      attempt_number: canRetry ? attempt + 1 : attempt,
      retry_at: retryAt,
      completed_at: canRetry ? null : completedAt.toISOString(),
      error_message: String(error?.message || error),
      execution_logs: logs,
      duration_ms: durationMs,
    })
    .eq('id', job.id)

  if (jobUpdate.error) throw jobUpdate.error

  const sourceUpdate = await sb
    .from('promo_sources')
    .update({
      status: sourceHealthForFailures(failures),
      consecutive_failure_count: failures,
      next_run_at: canRetry ? retryAt : computeNextRunAt(source, completedAt),
      locked_until: null,
    })
    .eq('id', source.id)

  if (sourceUpdate.error) throw sourceUpdate.error
}

export async function enqueueDuePromoJobs(limit = 10, triggerType = 'scheduled') {
  const sb = supabaseServer()
  const { data, error } = await sb.rpc('enqueue_due_promo_jobs', {
    p_limit: Math.max(1, Math.min(Number(limit || 10), 50)),
    p_trigger_type: triggerType,
  })

  if (error) throw error
  return data || []
}

export async function processNextPromoJob() {
  const sb = supabaseServer()
  const claim = await sb.rpc('claim_next_promo_job')
  if (claim.error) throw claim.error

  const job = claim.data?.[0]
  if (!job) return null

  const sourceResult = await sb.from('promo_sources').select('*').eq('id', job.source_id).single()
  if (sourceResult.error) throw sourceResult.error
  const source = sourceResult.data

  const startedAt = new Date()
  const logs = [logEntry('info', 'Ingestion job claimed', { sourceId: source.id, sourceName: source.name })]
  const counters = {
    discovered: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    review: 0,
    warnings: 0,
    materialChanges: 0,
  }

  try {
    const adapter = getPromotionSourceAdapter(source)
    const discovered = await adapter.discoverPromotionUrls()
    counters.discovered = discovered.length
    logs.push(logEntry('info', 'Promotion URLs discovered', { count: discovered.length }))

    for (const item of discovered) {
      try {
        const document = await adapter.fetchPromotion(item.url)
        const extracted = await adapter.extractPromotion(document)
        const outcome = await processExtractedPromotion(sb, source, job, extracted)

        counters[outcome.result] += 1
        if (outcome.review) counters.review += 1
        if (outcome.materialChange) counters.materialChanges += 1
      } catch (error) {
        counters.warnings += 1
        logs.push(logEntry('warning', 'Promotion page could not be processed', {
          url: item.url,
          error: String(error?.message || error),
        }))
      }
    }

    if (!discovered.length) {
      counters.warnings += 1
      logs.push(logEntry('warning', 'No promotion URLs were discovered'))
    }

    await completeJob(sb, job, source, counters, logs, startedAt)
    return { jobId: job.id, sourceId: source.id, status: 'completed', counters }
  } catch (error) {
    await failJob(sb, job, source, error, logs, startedAt)
    return {
      jobId: job.id,
      sourceId: source.id,
      status: 'failed',
      error: String(error?.message || error),
    }
  }
}

export async function processQueuedPromoJobs(limit = 3) {
  const results = []

  for (let index = 0; index < Math.max(1, Math.min(Number(limit || 3), 10)); index += 1) {
    const result = await processNextPromoJob()
    if (!result) break
    results.push(result)
  }

  return results
}
