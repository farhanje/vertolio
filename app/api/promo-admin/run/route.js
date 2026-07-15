import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase.server'
import { processQueuedPromoJobs } from '@/lib/promo/ingestion'
import { incrementLlmCounter, processExtractedPromotion } from '@/lib/promo/ingestion/core'
import { getPromotionSourceAdapter } from '@/lib/promo-sources/registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CURSOR_KEY = 'promo_ingestion_cursor'
const DIRECT_RETRY_COOLDOWN_MS = 10 * 60 * 1000

function ensureFullExtractionOutputBudget() {
  const configured = Number(process.env.PROMO_LLM_MAX_OUTPUT_TOKENS || 0)
  if (!Number.isFinite(configured) || configured < 4096) {
    process.env.PROMO_LLM_MAX_OUTPUT_TOKENS = '4096'
  }
}

function staleRunningCutoff() {
  return new Date(Date.now() - 90 * 1000).toISOString()
}

function emptyCounters() {
  return {
    discovered: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    deleted: 0,
    expiredSkipped: 0,
    notPromotion: 0,
    review: 0,
    warnings: 0,
    materialChanges: 0,
    llmCalled: 0,
    llmCached: 0,
    llmBudgetSkipped: 0,
    llmFailed: 0,
    llmSkippedUnchanged: 0,
    rulesOnly: 0,
    duplicates: 0,
    aiEnriched: 0,
    needsAttention: 0,
  }
}

function directRetryEligible(promotion) {
  if (!promotion?.segmentation_last_attempt_at) return true
  const attemptedAt = new Date(promotion.segmentation_last_attempt_at).getTime()
  return !Number.isFinite(attemptedAt) || Date.now() - attemptedAt >= DIRECT_RETRY_COOLDOWN_MS
}

async function incompletePromotions(sb) {
  const result = await sb
    .from('promotions')
    .select('id,source_id,canonical_url,title,intelligence_warnings,segmentation_last_attempt_at,updated_at')
    .eq('intelligence_method', 'rules')
    .eq('verification_status', 'needs_attention')
    .order('segmentation_last_attempt_at', {ascending: true, nullsFirst: true})
    .order('updated_at', {ascending: true})
    .limit(100)

  if (result.error) throw result.error
  return (result.data || []).filter(directRetryEligible)
}

async function processOneIncompletePromotion(sb) {
  const candidates = await incompletePromotions(sb)
  const promotion = candidates[0]
  if (!promotion) return null

  const sourceResult = await sb
    .from('promo_sources')
    .select('*')
    .eq('id', promotion.source_id)
    .single()

  if (sourceResult.error) throw sourceResult.error
  const source = sourceResult.data
  const counters = emptyCounters()
  counters.discovered = 1

  try {
    const adapter = getPromotionSourceAdapter(source)
    const document = await adapter.fetchPromotion(promotion.canonical_url)
    const extracted = await adapter.extractPromotion(document)
    const outcome = await processExtractedPromotion(sb, source, {
      id: null,
      trigger_type: 'administrator_retry',
    }, extracted)

    if (Object.prototype.hasOwnProperty.call(counters, outcome.result)) {
      counters[outcome.result] += 1
    }
    incrementLlmCounter(counters, outcome.llmStatus)
    if (outcome.review) counters.review += 1
    if (outcome.materialChange) counters.materialChanges += 1
    if (outcome.duplicate) counters.duplicates += 1
    if (outcome.aiEnriched) counters.aiEnriched += 1
    if (outcome.needsAttention) counters.needsAttention += 1

    return {
      jobId: null,
      sourceId: source.id,
      sourceName: source.name,
      status: 'completed',
      directRetry: true,
      promotionId: promotion.id,
      promotionTitle: promotion.title,
      counters,
      batch: {start: 0, end: 1, total: 1, hasMore: candidates.length > 1},
    }
  } catch (error) {
    const message = String(error?.message || error)
    const warnings = [...new Set([
      ...(Array.isArray(promotion.intelligence_warnings) ? promotion.intelligence_warnings : []),
      `Direct retry failed: ${message}`,
    ])]

    await sb
      .from('promotions')
      .update({
        segmentation_last_attempt_at: new Date().toISOString(),
        intelligence_warnings: warnings,
      })
      .eq('id', promotion.id)

    counters.warnings = 1
    counters.rulesOnly = 1

    return {
      jobId: null,
      sourceId: source.id,
      sourceName: source.name,
      status: 'completed_with_warnings',
      directRetry: true,
      promotionId: promotion.id,
      promotionTitle: promotion.title,
      error: message,
      counters,
      batch: {start: 0, end: 1, total: 1, hasMore: candidates.length > 1},
    }
  }
}

async function recoverStaleRunningJobs(sb, sourceIds = []) {
  let query = sb
    .from('promo_ingestion_jobs')
    .update({
      status: 'queued',
      scheduled_at: new Date().toISOString(),
      retry_at: null,
      started_at: null,
      completed_at: null,
      error_message: null,
    })
    .eq('status', 'running')
    .lt('started_at', staleRunningCutoff())

  if (sourceIds.length) query = query.in('source_id', sourceIds)
  const recovered = await query.select('id')
  if (recovered.error) throw recovered.error
  return recovered.data?.length || 0
}

async function reactivateDelayedRetries(sb, sourceIds = []) {
  let query = sb
    .from('promo_ingestion_jobs')
    .update({
      status: 'queued',
      scheduled_at: new Date().toISOString(),
      retry_at: null,
      started_at: null,
      completed_at: null,
      error_message: null,
    })
    .eq('status', 'retrying')

  if (sourceIds.length) query = query.in('source_id', sourceIds)
  const reactivated = await query.select('id')
  if (reactivated.error) throw reactivated.error
  return reactivated.data?.length || 0
}

async function resetSourceCursors(sb, sourceIds = []) {
  if (!sourceIds.length) return 0

  const result = await sb
    .from('promo_sources')
    .select('id,adapter_config')
    .in('id', sourceIds)

  if (result.error) throw result.error

  let resetCount = 0
  for (const source of result.data || []) {
    const adapterConfig = source.adapter_config && typeof source.adapter_config === 'object'
      ? {...source.adapter_config}
      : {}

    if (!adapterConfig[CURSOR_KEY]) continue
    delete adapterConfig[CURSOR_KEY]

    const updated = await sb
      .from('promo_sources')
      .update({adapter_config: adapterConfig})
      .eq('id', source.id)

    if (updated.error) throw updated.error
    resetCount += 1
  }

  return resetCount
}

async function makeSourceRunnableNow(sb, sourceId) {
  const existing = await sb
    .from('promo_ingestion_jobs')
    .select('id,status,started_at,retry_at')
    .eq('source_id', sourceId)
    .in('status', ['queued','running','retrying'])
    .maybeSingle()

  if (existing.error) throw existing.error

  const nowIso = new Date().toISOString()

  if (!existing.data) {
    const created = await sb.from('promo_ingestion_jobs').insert({
      source_id: sourceId,
      trigger_type: 'administrator_retry',
      status: 'queued',
      scheduled_at: nowIso,
    })
    if (created.error) throw created.error
    return 'created'
  }

  if (existing.data.status === 'running') return 'already_running'

  const reactivated = await sb
    .from('promo_ingestion_jobs')
    .update({
      trigger_type: 'administrator_retry',
      status: 'queued',
      scheduled_at: nowIso,
      retry_at: null,
      started_at: null,
      completed_at: null,
      error_message: null,
    })
    .eq('id', existing.data.id)

  if (reactivated.error) throw reactivated.error
  return existing.data.status === 'queued' ? 'already_queued' : 'reactivated'
}

async function unlockIncompleteIntelligence(sb, sourceIds) {
  if (!sourceIds.length) return 0

  const reset = await sb
    .from('promotions')
    .update({
      segmentation_provider: null,
      segmentation_model: null,
      segmentation_prompt_version: null,
      segmentation_taxonomy_version: null,
      segmentation_llm_status: null,
      segmentation_last_attempt_at: null,
      intelligence_method: 'rules',
    })
    .in('source_id', sourceIds)
    .eq('intelligence_method', 'rules')
    .eq('verification_status', 'needs_attention')
    .select('id')

  if (reset.error) throw reset.error
  return reset.data?.length || 0
}

async function activeJobCount(sb) {
  const result = await sb
    .from('promo_ingestion_jobs')
    .select('id', {count: 'exact', head: true})
    .in('status', ['queued','running','retrying'])

  if (result.error) throw result.error
  return result.count || 0
}

export async function POST(request) {
  try {
    ensureFullExtractionOutputBudget()
    const runStartedAt = new Date().toISOString()
    const body = await request.json().catch(() => ({}))
    const action = body.action === 'continue' ? 'continue' : 'start'
    const sourceId = String(body.sourceId || '').trim()
    const sb = supabaseServer()
    const queueActions = {
      created: 0,
      reactivated: 0,
      alreadyQueued: 0,
      alreadyRunning: 0,
      staleRecovered: 0,
      delayedRetriesReactivated: 0,
      cursorsReset: 0,
    }
    let retryUnlocked = 0
    let sourceIds = []

    if (action === 'start') {
      if (sourceId) {
        sourceIds = [sourceId]
      } else {
        const sources = await sb
          .from('promo_sources')
          .select('id')
          .eq('enabled', true)
          .not('status', 'in', '(paused,unsupported)')
          .order('name')

        if (sources.error) throw sources.error
        sourceIds = (sources.data || []).map((source) => source.id)
      }

      queueActions.staleRecovered = await recoverStaleRunningJobs(sb, sourceIds)
      queueActions.delayedRetriesReactivated = await reactivateDelayedRetries(sb, sourceIds)
      retryUnlocked = await unlockIncompleteIntelligence(sb, sourceIds)

      if (retryUnlocked > 0) {
        queueActions.cursorsReset = await resetSourceCursors(sb, sourceIds)
      }

      for (const id of sourceIds) {
        const queueAction = await makeSourceRunnableNow(sb, id)
        if (queueAction === 'created') queueActions.created += 1
        if (queueAction === 'reactivated') queueActions.reactivated += 1
        if (queueAction === 'already_queued') queueActions.alreadyQueued += 1
        if (queueAction === 'already_running') queueActions.alreadyRunning += 1
      }
    } else {
      queueActions.staleRecovered = await recoverStaleRunningJobs(sb)
      queueActions.delayedRetriesReactivated = await reactivateDelayedRetries(sb)
    }

    const directRetry = await processOneIncompletePromotion(sb)
    const processed = directRetry ? [directRetry] : await processQueuedPromoJobs(1)
    const [activeJobs, remainingDirectRetries, latestFailure] = await Promise.all([
      activeJobCount(sb),
      incompletePromotions(sb),
      sb
        .from('promo_llm_usage')
        .select('error_message,operation,model,created_at')
        .eq('status', 'failed')
        .gte('created_at', runStartedAt)
        .order('created_at', {ascending: false})
        .limit(1)
        .maybeSingle(),
    ])
    const remainingJobs = activeJobs + remainingDirectRetries.length

    return NextResponse.json({
      ok: true,
      action,
      queuedSources: queueActions.created,
      reactivatedJobs: queueActions.reactivated,
      delayedRetriesReactivated: queueActions.delayedRetriesReactivated,
      alreadyQueuedJobs: queueActions.alreadyQueued,
      alreadyRunningJobs: queueActions.alreadyRunning,
      staleRecoveredJobs: queueActions.staleRecovered,
      cursorsReset: queueActions.cursorsReset,
      totalSources: sourceIds.length,
      retryUnlocked,
      directRetryProcessed: Boolean(directRetry),
      remainingDirectRetries: remainingDirectRetries.length,
      processed,
      remainingJobs,
      outputTokenLimit: Number(process.env.PROMO_LLM_MAX_OUTPUT_TOKENS || 4096),
      latestAiFailure: latestFailure.error ? null : latestFailure.data,
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'Automatic promo update failed',
      detail: String(error?.message || error),
    }, {status: 500})
  }
}
