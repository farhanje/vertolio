import {NextResponse} from 'next/server'
import {supabaseServer} from '@/lib/supabase.server'

export async function POST(req) {
  try {
    const body = await req.json()
    const sessionId = String(body.sessionId || '').trim()
    const screenId = String(body.screenId || '').trim()
    const eventType = String(body.eventType || 'click').trim()

    if (!sessionId) return NextResponse.json({error: 'Missing sessionId'}, {status: 400})
    if (!screenId) return NextResponse.json({error: 'Missing screenId'}, {status: 400})

    const allowed = new Set(['click', 'nav_next', 'nav_back'])
    if (!allowed.has(eventType)) return NextResponse.json({error: 'Invalid eventType'}, {status: 400})

    const sb = supabaseServer()
    const {data: session, error: sessionError} = await sb.from('sessions').select('*').eq('id', sessionId).maybeSingle()
    if (sessionError) throw sessionError
    if (!session) return NextResponse.json({error: 'Session not found'}, {status: 404})

    let flowStepRunId = body.flowStepRunId || null
    let flowStepId = body.flowStepId || null
    let flowStepOrder = Number.isFinite(Number(body.flowStepOrder)) ? Math.max(0, Math.round(Number(body.flowStepOrder))) : null

    if ((!flowStepRunId || !flowStepId) && body.taskRunId) {
      const {data: taskRun} = await sb.from('task_runs').select('flowStepRunId, flowStepId, flowStepOrder').eq('id', body.taskRunId).maybeSingle()
      flowStepRunId = flowStepRunId || taskRun?.flowStepRunId || null
      flowStepId = flowStepId || taskRun?.flowStepId || null
      flowStepOrder = flowStepOrder ?? taskRun?.flowStepOrder ?? null
    }

    const {error} = await sb.from('screen_events').insert({
      studyId: session.studyId,
      sessionId,
      taskRunId: body.taskRunId || null,
      flowStepRunId,
      flowStepId,
      flowStepOrder,
      screenId,
      eventType,
      x: Number.isFinite(Number(body.x)) ? Number(body.x) : null,
      y: Number.isFinite(Number(body.y)) ? Number(body.y) : null,
      targetHotspotId: body.targetHotspotId || null,
      isMisclick: Boolean(body.isMisclick),
      meta: body.meta || null,
    })

    if (error) throw error
    return NextResponse.json({status: 'ok'})
  } catch (e) {
    return NextResponse.json({error: 'Server error', detail: String(e?.message || e)}, {status: 500})
  }
}
