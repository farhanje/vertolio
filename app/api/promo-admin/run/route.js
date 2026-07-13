import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase.server'
import { processQueuedPromoJobs } from '@/lib/promo/ingestion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function queueSource(sb, sourceId) {
  const existing = await sb
    .from('promo_ingestion_jobs')
    .select('id')
    .eq('source_id', sourceId)
    .in('status', ['queued','running','retrying'])
    .maybeSingle()

  if (existing.error) throw existing.error
  if (existing.data) return false

  const created = await sb.from('promo_ingestion_jobs').insert({
    source_id: sourceId,
    trigger_type: 'administrator_retry',
    status: 'queued',
    scheduled_at: new Date().toISOString(),
  })
  if (created.error) throw created.error
  return true
}

export async function POST(request) {
  try {
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

    let queuedSources = 0
    for (const id of sourceIds) {
      if (await queueSource(sb, id)) queuedSources += 1
    }

    const processed = await processQueuedPromoJobs(Math.min(Math.max(sourceIds.length, 1), 3))
    const remaining = await sb
      .from('promo_ingestion_jobs')
      .select('id', {count: 'exact', head: true})
      .in('status', ['queued','running','retrying'])

    if (remaining.error) throw remaining.error

    return NextResponse.json({
      ok: true,
      queuedSources,
      totalSources: sourceIds.length,
      processed,
      remainingJobs: remaining.count || 0,
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'Automatic promo update failed',
      detail: String(error?.message || error),
    }, {status: 500})
  }
}
