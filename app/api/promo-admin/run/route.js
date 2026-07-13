import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase.server'
import { enqueueDuePromoJobs, processQueuedPromoJobs } from '@/lib/promo/ingestion'
import { getPromoLlmConfig } from '@/lib/promo/llm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const sourceId = String(body.sourceId || '').trim()
    const forceLlmRetry = Boolean(body.forceLlmRetry)
    const sb = supabaseServer()
    let forcedRetryRows = 0

    if (forceLlmRetry) {
      if (!sourceId) throw new Error('Select one source before forcing a Gemini retry')

      const config = getPromoLlmConfig()
      if (!config.enabled) {
        throw new Error(config.apiKeyConfigured
          ? `Gemini is disabled by PROMO_LLM_MODE=${config.mode}`
          : 'GEMINI_API_KEY is not configured in this deployment')
      }

      const reset = await sb
        .from('promotions')
        .update({
          segmentation_provider: null,
          segmentation_model: null,
          segmentation_prompt_version: null,
          segmentation_taxonomy_version: null,
          segmentation_llm_status: null,
          segmentation_last_attempt_at: null,
        })
        .eq('source_id', sourceId)
        .select('id')

      if (reset.error) throw reset.error
      forcedRetryRows = reset.data?.length || 0
    }

    if (sourceId) {
      const existing = await sb
        .from('promo_ingestion_jobs')
        .select('id')
        .eq('source_id', sourceId)
        .in('status', ['queued','running','retrying'])
        .maybeSingle()

      if (existing.error) throw existing.error
      if (!existing.data) {
        const created = await sb.from('promo_ingestion_jobs').insert({
          source_id: sourceId,
          trigger_type: 'administrator_retry',
          status: 'queued',
          scheduled_at: new Date().toISOString(),
        })
        if (created.error) throw created.error
      }
    } else {
      await enqueueDuePromoJobs(10, 'administrator_retry')
    }

    const processed = await processQueuedPromoJobs(sourceId ? 1 : 3)
    return NextResponse.json({ ok: true, processed, forcedRetryRows })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'Admin source check failed',
      detail: String(error?.message || error),
    }, { status: 500 })
  }
}
