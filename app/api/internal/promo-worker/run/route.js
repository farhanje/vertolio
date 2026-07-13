import { NextResponse } from 'next/server'
import { isValidSchedulerRequest } from '@/lib/promo/auth'
import { processNextPromoJob } from '@/lib/promo/ingestion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function ensureFullExtractionOutputBudget() {
  const configured = Number(process.env.PROMO_LLM_MAX_OUTPUT_TOKENS || 0)
  if (!Number.isFinite(configured) || configured < 2600) {
    process.env.PROMO_LLM_MAX_OUTPUT_TOKENS = '2600'
  }
}

export async function POST(request) {
  if (!isValidSchedulerRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    ensureFullExtractionOutputBudget()
    const processed = await processNextPromoJob()
    return NextResponse.json({
      ok: true,
      processed,
      hadQueuedJob: Boolean(processed),
      outputTokenLimit: Number(process.env.PROMO_LLM_MAX_OUTPUT_TOKENS || 2600),
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
