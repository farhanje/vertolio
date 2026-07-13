import { supabaseServer } from '@/lib/supabase.server'
import { getPromotionSourceAdapter } from '@/lib/promo-sources/registry'
import { computeNextRunAt, retryDelayMinutes, sourceHealthForFailures } from '../schedule'
import { incrementLlmCounter, processExtractedPromotion } from './core'

function logEntry(level, message, meta = {}) {
  return {
    at: new Date().toISOString(),
    level,
    message,
    ...meta,
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

  const {error: jobError} = await sb
    .from('promo_ingestion_jobs')
    .update({
      status,
      completed_at: completedAt.toISOString(),
      records_discovered: counters.discovered,
      records_created: counters.created,
      records_updated: counters.updated,
      records_unchanged: counters.unchanged,
      records_deleted: counters.deleted,
      records_expired_skipped: counters.expiredSkipped,
      records_requiring_review: counters.review,
      records_llm_called: counters.llmCalled,
      records_llm_cached: counters.llmCached,
      records_llm_budget_skipped: counters.llmBudgetSkipped,
      records_llm_failed: counters.llmFailed,
      records_llm_skipped_unchanged: counters.llmSkippedUnchanged,
      records_rules_only: counters.rulesOnly,
      execution_logs: logs,
      duration_ms: durationMs,
    })
    .eq('id', job.id)

  if (jobError) throw jobError

  const {error: sourceError} = await sb
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
  const {data, error} = await sb.rpc('enqueue_due_promo_jobs', {
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
  const logs = [logEntry('info', 'Ingestion job claimed', {sourceId: source.id, sourceName: source.name})]
  const counters = {
    discovered: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    deleted: 0,
    expiredSkipped: 0,
    review: 0,
    warnings: 0,
    materialChanges: 0,
    llmCalled: 0,
    llmCached: 0,
    llmBudgetSkipped: 0,
    llmFailed: 0,
    llmSkippedUnchanged: 0,
    rulesOnly: 0,
  }

  try {
    const adapter = getPromotionSourceAdapter(source)
    const discovered = await adapter.discoverPromotionUrls()
    counters.discovered = discovered.length
    logs.push(logEntry('info', 'Promotion URLs discovered', {count: discovered.length}))

    for (const item of discovered) {
      try {
        const document = await adapter.fetchPromotion(item.url)
        const extracted = await adapter.extractPromotion(document)
        const outcome = await processExtractedPromotion(sb, source, job, extracted)

        counters[outcome.result] += 1
        incrementLlmCounter(counters, outcome.llmStatus)
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

    logs.push(logEntry('info', 'Automatic intelligence summary', {
      created: counters.created,
      updated: counters.updated,
      unchanged: counters.unchanged,
      deletedExpired: counters.deleted,
      skippedExpired: counters.expiredSkipped,
      llmCalled: counters.llmCalled,
      llmCached: counters.llmCached,
      llmBudgetSkipped: counters.llmBudgetSkipped,
      llmFailed: counters.llmFailed,
      llmSkippedUnchanged: counters.llmSkippedUnchanged,
      rulesOnly: counters.rulesOnly,
    }))

    await completeJob(sb, job, source, counters, logs, startedAt)
    return {jobId: job.id, sourceId: source.id, status: 'completed', counters}
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
