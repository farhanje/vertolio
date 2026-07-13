import { NextResponse } from 'next/server'
import { isValidSchedulerRequest } from '@/lib/promo/auth'
import { enqueueDuePromoJobs } from '@/lib/promo/ingestion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request) {
  if (!isValidSchedulerRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const enqueueLimit = Math.max(1, Math.min(Number(body.enqueueLimit || 10), 50))
    const enqueued = await enqueueDuePromoJobs(enqueueLimit, 'scheduled')

    return NextResponse.json({
      ok: true,
      enqueued: enqueued.map((job) => job.id),
      enqueuedCount: enqueued.length,
      ranAt: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'Scheduler run failed',
      detail: String(error?.message || error),
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
