import { NextResponse } from 'next/server'
import { isValidSchedulerRequest } from '@/lib/promo/auth'
import { processNextPromoJob } from '@/lib/promo/ingestion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request) {
  if (!isValidSchedulerRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const processed = await processNextPromoJob()
    return NextResponse.json({
      ok: true,
      processed,
      hadQueuedJob: Boolean(processed),
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
