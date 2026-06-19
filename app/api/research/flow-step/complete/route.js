import {NextResponse} from 'next/server'
import {supabaseServer} from '@/lib/supabase.server'

function migrationMissing(error) {
  const msg = String(error?.message || error || '').toLowerCase()
  return msg.includes('flow_step_runs') || msg.includes('does not exist') || msg.includes('schema cache')
}

export async function POST(req) {
  try {
    const body = await req.json()
    const flowStepRunId = String(body.flowStepRunId || '').trim()

    if (!flowStepRunId) return NextResponse.json({status: 'skipped', reason: 'missing_flow_step_run_id'})

    const sb = supabaseServer()
    const payload = {
      status: body.status || 'completed',
      endedAt: new Date().toISOString(),
      durationMs: Number.isFinite(Number(body.durationMs)) ? Math.max(0, Math.round(Number(body.durationMs))) : null,
    }

    const {error} = await sb.from('flow_step_runs').update(payload).eq('id', flowStepRunId)

    if (error && migrationMissing(error)) return NextResponse.json({status: 'skipped'})
    if (error) throw error

    return NextResponse.json({status: 'ok'})
  } catch (e) {
    return NextResponse.json({error: 'Server error', detail: String(e?.message || e)}, {status: 500})
  }
}
