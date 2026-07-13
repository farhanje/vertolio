import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase.server'
import { processQueuedPromoJobs } from '@/lib/promo/ingestion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function ensureFullExtractionOutputBudget() {
  const configured = Number(process.env.PROMO_LLM_MAX_OUTPUT_TOKENS || 0)
  if (!Number.isFinite(configured) || configured < 2600) {
    process.env.PROMO_LLM_MAX_OUTPUT_TOKENS = '2600'
  }
}

async function makeSourceRunnableNow(sb, sourceId) {
  const existing = await sb
    .from('promo_ingestion_jobs')
    .select('id,status,started_at,retry_at')
    .eq('source_id', sourceId)
    .in('status', ['queued','running','retrying'])
    .maybeSingle()

  if (existing.error) throw existing.error

  const now = new Date()
  const nowIso = now.toISOString()
  const staleRunningBefore = new Date(now.getTime() - 15 * 60 * 1000)

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

  if (existing.data.status === 'running') {
    const startedAt = existing.data.started_at ? new Date(existing.data.started_at) : null
    if (startedAt && startedAt > staleRunningBefore) return 'already_running'
  }

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

export async function POST(request) {
  try {
    ensureFullExtractionOutputBudget()
    const runStartedAt = new Date().toISOString()
    const body = await request.json().catch(() => ({}))
    const sourceId = String(body.sourceId || '').trim()
    const sb = supabaseServer()

    let sourceIds = []
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

    const retryUnlocked = await unlockIncompleteIntelligence(sb, sourceIds)
    const queueActions = {
      created: 0,
      reactivated: 0,
      alreadyQueued: 0,
      alreadyRunning: 0,
    }

    for (const id of sourceIds) {
      const action = await makeSourceRunnableNow(sb, id)
      if (action === 'created') queueActions.created += 1
      if (action === 'reactivated') queueActions.reactivated += 1
      if (action === 'already_queued') queueActions.alreadyQueued += 1
      if (action === 'already_running') queueActions.alreadyRunning += 1
    }

    const runnableCount = queueActions.created + queueActions.reactivated + queueActions.alreadyQueued
    const processed = runnableCount > 0
      ? await processQueuedPromoJobs(Math.min(runnableCount, 3))
      : []

    const [remaining, latestFailure] = await Promise.all([
      sb
        .from('promo_ingestion_jobs')
        .select('id', {count: 'exact', head: true})
        .in('status', ['queued','running','retrying']),
      sb
        .from('promo_llm_usage')
        .select('error_message,operation,model,created_at')
        .eq('status', 'failed')
        .gte('created_at', runStartedAt)
        .order('created_at', {ascending: false})
        .limit(1)
        .maybeSingle(),
    ])

    if (remaining.error) throw remaining.error

    return NextResponse.json({
      ok: true,
      queuedSources: queueActions.created,
      reactivatedJobs: queueActions.reactivated,
      alreadyQueuedJobs: queueActions.alreadyQueued,
      alreadyRunningJobs: queueActions.alreadyRunning,
      totalSources: sourceIds.length,
      retryUnlocked,
      processed,
      remainingJobs: remaining.count || 0,
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
