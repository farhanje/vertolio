import {NextResponse} from 'next/server'
import {supabaseServer} from '@/lib/supabase.server'

export async function POST(req) {
  try {
    const body = await req.json()
    const taskRunId = String(body.taskRunId || '').trim()

    if (!taskRunId) return NextResponse.json({error: 'Missing taskRunId'}, {status: 400})

    const sb = supabaseServer()
    const {error} = await sb
      .from('task_runs')
      .update({
        endedAt: new Date().toISOString(),
        durationMs: Number.isFinite(Number(body.durationMs)) ? Math.max(0, Math.round(Number(body.durationMs))) : null,
        success: Boolean(body.success),
        attempts: Number.isFinite(Number(body.attempts)) ? Math.max(0, Math.round(Number(body.attempts))) : 0,
        misclickCount: Number.isFinite(Number(body.misclickCount)) ? Math.max(0, Math.round(Number(body.misclickCount))) : 0,
      })
      .eq('id', taskRunId)

    if (error) throw error

    return NextResponse.json({status: 'ok'})
  } catch (e) {
    return NextResponse.json({error: 'Server error', detail: String(e?.message || e)}, {status: 500})
  }
}
