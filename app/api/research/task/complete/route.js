import {NextResponse} from 'next/server'
import {supabaseServer} from '@/lib/supabase.server'

function safeNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback
}

export async function POST(req) {
  try {
    const body = await req.json()
    const taskRunId = String(body.taskRunId || '').trim()
    const requestedStatus = String(body.status || '').trim()
    const isSkipped = requestedStatus === 'skipped' || body.skipped === true

    if (!taskRunId) return NextResponse.json({error: 'Missing taskRunId'}, {status: 400})

    const sb = supabaseServer()
    const endedAt = new Date().toISOString()
    const durationMs = Number.isFinite(Number(body.durationMs)) ? safeNumber(body.durationMs, null) : null
    const taskPayload = {
      endedAt,
      durationMs,
      success: isSkipped ? false : Boolean(body.success),
      attempts: safeNumber(body.attempts, 0),
      misclickCount: safeNumber(body.misclickCount, 0),
    }

    const {data: taskRun, error} = await sb
      .from('task_runs')
      .update(taskPayload)
      .eq('id', taskRunId)
      .select('id, flowStepRunId, endedAt, durationMs, success')
      .single()

    if (error) throw error

    if (taskRun?.flowStepRunId) {
      const flowStepStatus = isSkipped ? 'skipped' : 'completed'
      const {error: flowStepError} = await sb
        .from('flow_step_runs')
        .update({
          status: flowStepStatus,
          endedAt: taskRun.endedAt || endedAt,
          durationMs: taskRun.durationMs ?? durationMs,
          meta: {
            taskRunId: taskRun.id,
            taskSuccess: Boolean(taskRun.success),
            skipped: isSkipped,
          },
        })
        .eq('id', taskRun.flowStepRunId)

      if (flowStepError) throw flowStepError
    }

    return NextResponse.json({status: 'ok', flowStepRunId: taskRun?.flowStepRunId || null, skipped: isSkipped})
  } catch (e) {
    return NextResponse.json({error: 'Server error', detail: String(e?.message || e)}, {status: 500})
  }
}
