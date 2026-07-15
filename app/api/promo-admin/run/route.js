import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase.server'
import { processQueuedPromoJobs } from '@/lib/promo/ingestion'
import { processNextPromoAiResolutionBatch } from '@/lib/promo/ai-resolver'
import { ensureSelectiveAiLimits } from '@/lib/promo/selective-ai-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CURSOR_KEY = 'promo_ingestion_cursor'

function staleRunningCutoff() {
  return new Date(Date.now() - 90 * 1000).toISOString()
}

async function pipelineReady(sb) {
  const result = await sb
    .from('promo_ai_resolution_queue')
    .select('id', {count: 'exact', head: true})
  return !result.error
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
    .select('id,status')
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

async function activeJobCount(sb) {
  const result = await sb
    .from('promo_ingestion_jobs')
    .select('id', {count: 'exact', head: true})
    .in('status', ['queued','running','retrying'])
  if (result.error) throw result.error
  return result.count || 0
}

async function queuedAiCount(sb) {
  const result = await sb
    .from('promo_ai_resolution_queue')
    .select('id', {count: 'exact', head: true})
    .eq('status', 'queued')
  if (result.error) return 0
  return result.count || 0
}

export async function POST(request) {
  try {
    const runStartedAt = new Date().toISOString()
    const body = await request.json().catch(() => ({}))
    const action = body.action === 'continue' ? 'continue' : 'start'
    const sourceId = String(body.sourceId || '').trim()
    const sb = supabaseServer()

    if (!await pipelineReady(sb)) {
      return NextResponse.json({
        ok: false,
        error: 'Deterministic-first database migration is required before running the engine',
      }, {status: 409})
    }

    ensureSelectiveAiLimits()
    const queueActions = {
      created: 0,
      reactivated: 0,
      alreadyQueued: 0,
      alreadyRunning: 0,
      staleRecovered: 0,
      delayedRetriesReactivated: 0,
      cursorsReset: 0,
    }
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
      queueActions.cursorsReset = await resetSourceCursors(sb, sourceIds)

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

    const processed = await processQueuedPromoJobs(1)
    const sourceJobsRemaining = await activeJobCount(sb)
    const aiBatch = sourceJobsRemaining === 0 ? await processNextPromoAiResolutionBatch() : null
    const [remainingAiItems, latestFailure] = await Promise.all([
      queuedAiCount(sb),
      sb
        .from('promo_llm_usage')
        .select('error_message,operation,model,created_at')
        .eq('status', 'failed')
        .eq('operation', 'promo_ambiguity_batch')
        .gte('created_at', runStartedAt)
        .order('created_at', {ascending: false})
        .limit(1)
        .maybeSingle(),
    ])
    const remainingJobs = sourceJobsRemaining + (remainingAiItems > 0 ? 1 : 0)

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
      processed,
      aiBatch,
      remainingSourceJobs: sourceJobsRemaining,
      remainingAiItems,
      remainingJobs,
      latestAiFailure: latestFailure.error ? null : latestFailure.data,
      strategy: 'deterministic_first_selective_ai',
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'Automatic promo update failed',
      detail: String(error?.message || error),
    }, {status: 500})
  }
}
