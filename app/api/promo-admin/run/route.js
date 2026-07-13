import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase.server'
import { enqueueDuePromoJobs, processQueuedPromoJobs } from '@/lib/promo/ingestion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const sourceId = String(body.sourceId || '').trim()
    const sb = supabaseServer()

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
    return NextResponse.json({ ok: true, processed })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'Admin source check failed',
      detail: String(error?.message || error),
    }, { status: 500 })
  }
}
