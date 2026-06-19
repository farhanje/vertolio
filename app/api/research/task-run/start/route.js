import {NextResponse} from 'next/server'
import {supabaseServer} from '@/lib/supabase.server'

export async function POST(req) {
  try {
    const body = await req.json()
    const sessionId = String(body.sessionId || '').trim()
    const taskId = String(body.taskId || '').trim()
    const taskOrder = Number(body.taskOrder ?? 0)

    if (!sessionId) return NextResponse.json({error: 'Missing sessionId'}, {status: 400})
    if (!taskId) return NextResponse.json({error: 'Missing taskId'}, {status: 400})

    const sb = supabaseServer()
    const {data: session, error: sessionError} = await sb.from('sessions').select('*').eq('id', sessionId).maybeSingle()

    if (sessionError) throw sessionError
    if (!session) return NextResponse.json({error: 'Session not found'}, {status: 404})

    const payload = {
      studyId: session.studyId,
      sessionId,
      taskId,
      taskOrder,
      flowStepRunId: body.flowStepRunId || null,
      flowStepId: body.flowStepId || null,
      flowStepOrder: Number.isFinite(Number(body.flowStepOrder)) ? Math.max(0, Math.round(Number(body.flowStepOrder))) : null,
    }

    const {data: taskRun, error} = await sb.from('task_runs').insert(payload).select('*').single()
    if (error) throw error

    return NextResponse.json({taskRunId: taskRun.id})
  } catch (e) {
    return NextResponse.json({error: 'Server error', detail: String(e?.message || e)}, {status: 500})
  }
}
