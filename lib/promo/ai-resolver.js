import { sha256Hex } from '../promo-sources/base-adapter'
import { evaluatePublishability } from './publishability'
import { getPromoLlmConfig, runPromoLlmStructured } from './llm'

const BATCH_SIZE = 6
const TEXT_LIMIT = 3600
const RETRY_DELAY_HOURS = 12

const RESOLUTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      maxItems: BATCH_SIZE,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'queueId', 'merchant', 'offerSummary', 'expiresAt', 'locationScope',
          'cities', 'provinces', 'channels', 'evidence', 'unresolvedFields',
        ],
        properties: {
          queueId: {type: 'string'},
          merchant: {type: ['string', 'null']},
          offerSummary: {type: ['string', 'null']},
          expiresAt: {type: ['string', 'null']},
          locationScope: {type: ['string', 'null']},
          cities: {type: 'array', items: {type: 'string'}, maxItems: 20},
          provinces: {type: 'array', items: {type: 'string'}, maxItems: 20},
          channels: {type: 'array', items: {type: 'string'}, maxItems: 8},
          evidence: {
            type: 'array',
            maxItems: 8,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['field','quote','confidence'],
              properties: {
                field: {type: 'string'},
                quote: {type: 'string'},
                confidence: {type: 'number'},
              },
            },
          },
          unresolvedFields: {type: 'array', items: {type: 'string'}, maxItems: 8},
        },
      },
    },
  },
}

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizedEvidence(value) {
  return normalize(value).toLowerCase().replace(/[“”"'`]/g, '').replace(/\s*[-–—,:;.]\s*/g, ' ')
}

function evidenceMatches(text, quote) {
  const source = normalizedEvidence(text)
  const candidate = normalizedEvidence(quote)
  return Boolean(candidate && candidate.length >= 3 && source.includes(candidate))
}

function validDate(value) {
  const text = normalize(value)
  if (!text) return null
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T23:59:59.999+07:00`)
    : new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function unique(values) {
  return [...new Set((values || []).map(normalize).filter(Boolean))]
}

function fieldEvidenceMap(items, sourceText) {
  const evidence = {}
  const confidence = {}
  for (const item of Array.isArray(items) ? items : []) {
    const field = normalize(item?.field)
    const quote = normalize(item?.quote).slice(0, 500)
    const score = Math.max(0, Math.min(Number(item?.confidence || 0), 1))
    if (!field || !quote || !evidenceMatches(sourceText, quote)) continue
    if (score < Number(confidence[field] || 0)) continue
    evidence[field] = quote
    confidence[field] = score
  }
  return {evidence, confidence}
}

function promotionFields(promotion) {
  return {
    title: promotion.title,
    merchant: promotion.merchant,
    provider: promotion.provider,
    offerSummary: promotion.offer_summary,
    requirementsSummary: promotion.requirements_summary,
    paymentMethods: promotion.payment_methods || [],
    minimumSpend: promotion.minimum_spend,
    benefitType: promotion.benefit_type,
    benefitValue: promotion.benefit_value,
    maximumBenefit: promotion.maximum_benefit,
    voucherCode: promotion.voucher_code,
    startsAt: promotion.starts_at,
    expiresAt: promotion.expires_at,
    applicableDays: promotion.applicable_days || [],
    eligibility: promotion.eligibility || {},
    channels: promotion.channels || [],
    termsText: promotion.terms_text,
    primaryCategory: promotion.primary_category,
    categories: promotion.categories || [],
    tags: promotion.tags || [],
    locationScope: promotion.location_scope,
    cities: promotion.cities || [],
    provinces: promotion.provinces || [],
    outlets: [],
    sourceTrustLevel: promotion.source_trust_level,
    sourceTrustReasons: promotion.source_trust_reasons || [],
    fieldEvidence: promotion.field_evidence || {},
    fieldConfidence: promotion.field_confidence || {},
    intelligenceWarnings: promotion.intelligence_warnings || [],
    contradictions: promotion.contradictions || [],
  }
}

async function hydrateBatch(sb, rows) {
  const promotionIds = rows.map((row) => row.promotion_id)
  const documentIds = rows.map((row) => row.document_id).filter(Boolean)
  const sourceIds = [...new Set(rows.map((row) => row.source_id))]
  const [promotionsResult, documentsResult, sourcesResult] = await Promise.all([
    sb.from('promotions').select('*').in('id', promotionIds),
    documentIds.length
      ? sb.from('promo_documents').select('*').in('id', documentIds)
      : Promise.resolve({data: [], error: null}),
    sb.from('promo_sources').select('*').in('id', sourceIds),
  ])
  if (promotionsResult.error) throw promotionsResult.error
  if (documentsResult.error) throw documentsResult.error
  if (sourcesResult.error) throw sourcesResult.error

  const promotions = new Map((promotionsResult.data || []).map((item) => [item.id, item]))
  const documents = new Map((documentsResult.data || []).map((item) => [item.id, item]))
  const sources = new Map((sourcesResult.data || []).map((item) => [item.id, item]))

  return rows.map((row) => ({
    queue: row,
    promotion: promotions.get(row.promotion_id),
    document: documents.get(row.document_id),
    source: sources.get(row.source_id),
  })).filter((item) => item.promotion && item.source)
}

async function queueReview(sb, item, missingFields) {
  const reasons = unique((missingFields || []).map((field) => `ai_unresolved:${field}`))
  if (!reasons.length) return
  const inserted = await sb.from('promo_review_queue').insert({
    document_id: item.document?.id || null,
    promotion_id: item.promotion.id,
    reasons,
    suggested_fields: promotionFields(item.promotion),
  })
  if (inserted.error && inserted.error.code !== '23505') throw inserted.error
}

async function finishQueueItem(sb, item, update) {
  const result = await sb.from('promo_ai_resolution_queue').update(update).eq('id', item.queue.id)
  if (result.error) throw result.error
}

async function releaseBatchAfterFailure(sb, items, error, status) {
  const budgetBlocked = ['skipped_budget','skipped_daily_limit'].includes(status)
  for (const item of items) {
    const attempts = Number(item.queue.attempt_count || 0)
    if (budgetBlocked || attempts < 2) {
      const retryAt = new Date(Date.now() + (budgetBlocked ? 24 : RETRY_DELAY_HOURS) * 60 * 60 * 1000).toISOString()
      await finishQueueItem(sb, item, {
        status: 'queued',
        next_attempt_at: retryAt,
        last_error: error || status,
      })
    } else {
      await finishQueueItem(sb, item, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        last_error: error || status,
      })
      await queueReview(sb, item, item.queue.missing_fields)
    }
  }
}

function applyResolution(item, value) {
  const promotion = item.promotion
  const sourceText = item.document?.raw_relevant_text || promotion.terms_text || ''
  const allowed = new Set(item.queue.missing_fields || [])
  const maps = fieldEvidenceMap(value?.evidence, sourceText)
  const updates = {}
  const evidence = {...(promotion.field_evidence || {})}
  const confidence = {...(promotion.field_confidence || {})}

  function accept(field, target, rawValue, transform = normalize) {
    if (!allowed.has(field)) return
    const quote = maps.evidence[field]
    if (!quote) return
    const resolved = transform(rawValue)
    if (resolved === null || resolved === undefined || resolved === '') return
    updates[target] = resolved
    evidence[field] = quote
    confidence[field] = maps.confidence[field]
  }

  accept('merchant', 'merchant', value?.merchant)
  accept('offerSummary', 'offer_summary', value?.offerSummary)
  accept('validity', 'expires_at', value?.expiresAt, validDate)

  if (allowed.has('availability') && maps.evidence.availability) {
    const scope = ['nationwide','online','regional','city','outlet','unknown'].includes(value?.locationScope)
      ? value.locationScope
      : null
    if (scope && scope !== 'unknown') updates.location_scope = scope
    const cities = unique(value?.cities)
    const provinces = unique(value?.provinces)
    const channels = unique(value?.channels).filter((channel) => ['online','offline','in_app','website','merchant_outlet','other'].includes(channel))
    if (cities.length) updates.cities = cities
    if (provinces.length) updates.provinces = provinces
    if (channels.length) updates.channels = channels
    evidence.availability = maps.evidence.availability
    confidence.availability = maps.confidence.availability
  }

  return {updates, evidence, confidence, sourceText}
}

async function applyResolvedItem(sb, item, value, llmResponse) {
  const resolved = applyResolution(item, value)
  const mergedPromotion = {...item.promotion, ...resolved.updates}
  const fields = promotionFields(mergedPromotion)
  fields.fieldEvidence = resolved.evidence
  fields.fieldConfidence = resolved.confidence
  const extracted = {
    sourceUrl: mergedPromotion.source_url,
    canonicalUrl: mergedPromotion.canonical_url,
    rawRelevantText: resolved.sourceText,
    boundaryDiagnostics: mergedPromotion.boundary_diagnostics || {},
    ambiguityWarnings: mergedPromotion.intelligence_warnings || [],
    extractedFields: fields,
  }
  const publishability = evaluatePublishability(extracted, item.source)
  const verified = publishability.status === 'publishable'
    && ['official_source','trusted_aggregator'].includes(mergedPromotion.source_trust_level)
    && !(mergedPromotion.contradictions || []).length
  const verificationStatus = publishability.status === 'catalog_listing'
    ? 'catalog_listing'
    : verified
      ? 'verified'
      : 'needs_attention'
  const publicationStatus = verified && item.source.auto_publish_enabled ? 'published' : 'review'
  const config = getPromoLlmConfig()
  const promotionUpdate = {
    ...resolved.updates,
    field_evidence: resolved.evidence,
    field_confidence: resolved.confidence,
    intelligence_method: 'gemini',
    segmentation_method: 'llm_hybrid',
    segmentation_provider: llmResponse.provider || config.provider,
    segmentation_model: llmResponse.model || config.model,
    segmentation_prompt_version: config.promptVersion,
    segmentation_taxonomy_version: config.taxonomyVersion,
    segmentation_llm_status: llmResponse.status,
    segmentation_last_attempt_at: new Date().toISOString(),
    publishability_status: publishability.status,
    publishability_score: publishability.score,
    publishability_missing: publishability.missingFields,
    verification_status: verificationStatus,
    publication_status: publicationStatus,
    published_at: publicationStatus === 'published' ? new Date().toISOString() : null,
    last_verified_at: new Date().toISOString(),
  }
  const updated = await sb.from('promotions').update(promotionUpdate).eq('id', item.promotion.id)
  if (updated.error) throw updated.error

  await finishQueueItem(sb, item, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    result: value || {},
    last_error: publishability.missingFields.length ? `Unresolved after AI: ${publishability.missingFields.join(', ')}` : null,
  })
  if (publishability.status === 'unresolved') await queueReview(sb, item, publishability.missingFields)
  return {resolved: publishability.status !== 'unresolved', publishabilityStatus: publishability.status}
}

export async function processNextPromoAiResolutionBatch({minimumAgeMinutes = 0} = {}) {
  const {supabaseServer} = await import('@/lib/supabase.server')
  const sb = supabaseServer()

  if (minimumAgeMinutes > 0) {
    const cutoff = new Date(Date.now() - minimumAgeMinutes * 60 * 1000).toISOString()
    const oldest = await sb
      .from('promo_ai_resolution_queue')
      .select('id')
      .eq('status', 'queued')
      .lte('next_attempt_at', new Date().toISOString())
      .lte('created_at', cutoff)
      .limit(1)
    if (oldest.error) throw oldest.error
    if (!oldest.data?.length) return null
  }

  const claim = await sb.rpc('claim_promo_ai_resolution_batch', {p_limit: BATCH_SIZE})
  if (claim.error) throw claim.error
  if (!claim.data?.length) return null
  const items = await hydrateBatch(sb, claim.data)
  if (!items.length) return null

  const candidates = items.map((item) => ({
    queueId: item.queue.id,
    missingFields: item.queue.missing_fields,
    knownFields: {
      title: item.promotion.title,
      merchant: item.promotion.merchant,
      offerSummary: item.promotion.offer_summary,
      expiresAt: item.promotion.expires_at,
      locationScope: item.promotion.location_scope,
      cities: item.promotion.cities,
      provinces: item.promotion.provinces,
      channels: item.promotion.channels,
    },
    sourceText: String(item.document?.raw_relevant_text || item.promotion.terms_text || '').slice(0, TEXT_LIMIT),
  }))
  const batchHash = sha256Hex(JSON.stringify(candidates.map((item) => ({id: item.queueId, missing: item.missingFields, text: item.sourceText}))))
  const llmResponse = await runPromoLlmStructured({
    sb,
    contentHash: `promo-ambiguity-batch-v1:${batchHash}`,
    operation: 'promo_ambiguity_batch',
    canonicalUrl: `batch:${batchHash}`,
    maxOutputTokens: 1800,
    bypassCache: false,
    systemInstruction: [
      'You resolve missing fields for Indonesian consumer promotions in bulk.',
      'Change only fields listed in missingFields for each item.',
      'Use only the supplied sourceText and never invent dates, merchants, locations, channels, or offer mechanics.',
      'Every resolved field must include one exact evidence quote copied from that item sourceText.',
      'If evidence is absent, leave the value null or empty and include the field in unresolvedFields.',
      'Return compact JSON only.',
    ].join(' '),
    input: JSON.stringify({items: candidates}),
    schema: RESOLUTION_SCHEMA,
  })

  if (!['success','cached'].includes(llmResponse.status) || !llmResponse.result) {
    await releaseBatchAfterFailure(sb, items, llmResponse.error, llmResponse.status)
    return {
      status: llmResponse.status || 'failed',
      claimed: items.length,
      resolved: 0,
      error: llmResponse.error || null,
    }
  }

  const results = new Map((llmResponse.result.items || []).map((item) => [String(item.queueId), item]))
  let resolvedCount = 0
  for (const item of items) {
    const value = results.get(String(item.queue.id)) || {queueId: item.queue.id, evidence: [], unresolvedFields: item.queue.missing_fields}
    const outcome = await applyResolvedItem(sb, item, value, llmResponse)
    if (outcome.resolved) resolvedCount += 1
  }

  return {
    status: llmResponse.status,
    claimed: items.length,
    resolved: resolvedCount,
    unresolved: items.length - resolvedCount,
    inputTokens: Number(llmResponse.inputTokens || 0),
    outputTokens: Number(llmResponse.outputTokens || 0),
    estimatedCostUsd: Number(llmResponse.estimatedCostUsd || 0),
  }
}
