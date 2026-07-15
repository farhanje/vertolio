import { NextResponse } from 'next/server'
import { isValidSchedulerRequest } from '@/lib/promo/auth'
import { supabaseServer } from '@/lib/supabase.server'
import { processNextPromoJob } from '@/lib/promo/ingestion'
import { processNextPromoAiResolutionBatch } from '@/lib/promo/ai-resolver'
import { ensureSelectiveAiLimits } from '@/lib/promo/selective-ai-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function pipelineReady() {
  const result = await supabaseServer()
    .from('promo_ai_resolution_queue')
    .select('id', {count: 'exact', head: true})
  return !result.error
}

export async function POST(request) {
  if (!isValidSchedulerRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    if (!await pipelineReady()) {
      return NextResponse.json({
        ok: true,
        processed: null,
        aiBatch: null,
        hadWork: false,
        strategy: 'schema_not_ready',
        ranAt: new Date().toISOString(),
      })
    }

    ensureSelectiveAiLimits()
    let aiBatch = await processNextPromoAiResolutionBatch({minimumAgeMinutes: 30})
    let processed = null

    if (!aiBatch) processed = await processNextPromoJob()
    if (!processed && !aiBatch) aiBatch = await processNextPromoAiResolutionBatch()

    return NextResponse.json({
      ok: true,
      processed,
      aiBatch,
      hadWork: Boolean(processed || aiBatch),
      strategy: aiBatch ? 'bulk_ai_resolution' : processed ? 'deterministic_ingestion' : 'idle',
      ranAt: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'Promo worker run failed',
      detail: String(error?.message || error),
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
