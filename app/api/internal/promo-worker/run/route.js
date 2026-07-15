import { NextResponse } from 'next/server'
import { isValidSchedulerRequest } from '@/lib/promo/auth'
import { processNextPromoJob } from '@/lib/promo/ingestion'
import { processNextPromoAiResolutionBatch } from '@/lib/promo/ai-resolver'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request) {
  if (!isValidSchedulerRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // An unresolved batch older than 30 minutes gets priority so AI work cannot
    // starve behind a long source backfill. Otherwise deterministic ingestion
    // remains the default task for each worker run.
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
