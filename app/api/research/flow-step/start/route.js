import {NextResponse} from 'next/server'
import {supabaseServer} from '@/lib/supabase.server'

function migrationMissing(error) {
  const msg = String(error?.message || error || '').toLowerCase()
  return msg.includes('flow_step_runs') || msg.includes('does not exist') || msg.includes('schema cache')
}

export async function POST(req) {
  try {
    const body = await req.json()
    const sessionId = String(body.sessionId || '').trim()
    const stepId = String(body.stepId || '').trim()
    const stepType = String(body.stepType || '').trim()
    const stepOrder = Number(body.stepOrder ?? 0)

    if (!sessionId) return NextResponse.json({error: 'Missing sessionId'}, {status: 400})
    if (!stepId) return NextResponse.json({error: 'Missing stepId'}, {status: 400})
    if (!stepType) return NextResponse.json({error: 'Missing stepType'}, {status: 400})

    const sb = supabaseServer()
    const {data: session, error: sessionError} = await sb.from('sessions').select('*').eq('id', sessionId).maybeSingle()

    if (sessionError) throw sessionError
    if (!session) return NextResponse.json({error: 'Session not found'}, {status: 404})
    if (session.completionStatus === 'completed') return NextResponse.json({error: 'Session already completed'}, {status: 409})

    const {data: flowStep, error} = await sb
      .from('flow_step_runs')
      .insert({
        studyId: session.studyId,
        sessionId,
        stepId,
        stepType,
        stepOrder: Number.isFinite(stepOrder) ? Math.max(0, Math.round(stepOrder)) : null,
        variant: session.variant || null,
        status: 'in_progress',
        meta: body.meta || null,
      })
      .select('*')
      .single()

    if (error && migrationMissing(error)) return NextResponse.json({status: 'skipped', flowStepRunId: null})
    if (error) throw error

    return NextResponse.json({status: 'ok', flowStepRunId: flowStep.id})
  } catch (e) {
    return NextResponse.json({error: 'Server error', detail: String(e?.message || e)}, {status: 500})
  }
}
