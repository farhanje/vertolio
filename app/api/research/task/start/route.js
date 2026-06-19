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
    const {data: session, error: sessionError} = await sb
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError) throw sessionError
    if (!session) return NextResponse.json({error: 'Session not found'}, {status: 404})
    if (session.completionStatus === 'completed') return NextResponse.json({error: 'Session already completed'}, {status: 409})

    const stepOrder = Number.isFinite(taskOrder) ? Math.max(0, Math.round(taskOrder)) : null

    const {data: flowStep} = await sb
      .from('flow_step_runs')
      .insert({
        studyId: session.studyId,
        sessionId,
        stepId: taskId,
        stepType: 'prototype_task',
        stepOrder,
        variant: session.variant || null,
        status: 'in_progress',
        meta: {taskId},
      })
      .select('*')
      .single()

    const {data: taskRun, error: insertError} = await sb
      .from('task_runs')
      .insert({
        studyId: session.studyId,
        sessionId,
        taskId,
        taskOrder,
        flowStepRunId: flowStep?.id || null,
        flowStepId: taskId,
        flowStepOrder: stepOrder,
      })
      .select('*')
      .single()

    if (insertError) throw insertError
    return NextResponse.json({taskRunId: taskRun.id, flowStepRunId: flowStep?.id || null})
  } catch (e) {
    return NextResponse.json({error: 'Server error', detail: String(e?.message || e)}, {status: 500})
  }
}
