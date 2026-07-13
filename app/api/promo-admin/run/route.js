import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase.server'
import { processQueuedPromoJobs } from '@/lib/promo/ingestion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function ensureFullExtractionOutputBudget() {
  const configured = Number(process.env.PROMO_LLM_MAX_OUTPUT_TOKENS || 0)
  if (!Number.isFinite(configured) || configured < 2600) {
    process.env.PROMO_LLM_MAX_OUTPUT_TOKENS = '2600'
  }
}

function staleRunningCutoff() {
  return new Date(Date.now() - 90 * 1000).toISOString()
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
      verification_status: 'needs_attention',
    })
    .in('source_id', sourceIds)
    .eq('intelligence_method', 'rules')
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
    const [remainingJobs, latestFailure] = await Promise.all([
      activeJobCount(sb),
      sb
        .from('promo_llm_usage')
        .select('error_message,operation,model,created_at')
        .eq('status', 'failed')
        .gte('created_at', runStartedAt)
        .order('created_at', {ascending: false})
        .limit(1)
        .maybeSingle(),
    ])

    return NextResponse.json({
      ok: true,
      action,
      queuedSources: queueActions.created,
      reactivatedJobs: queueActions.reactivated,
      delayedRetriesReactivated: queueActions.delayedRetriesReactivated,
      alreadyQueuedJobs: queueActions.alreadyQueued,
      alreadyRunningJobs: queueActions.alreadyRunning,
      staleRecoveredJobs: queueActions.staleRecovered,
      totalSources: sourceIds.length,
      retryUnlocked,
      processed,
      remainingJobs,
      outputTokenLimit: Number(process.env.PROMO_LLM_MAX_OUTPUT_TOKENS || 2600),
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
