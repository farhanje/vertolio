import {NextResponse} from 'next/server'
import {supabaseServer} from '@/lib/supabase.server'

// Runtime endpoint for saving survey answers.
export async function POST(req) {
  try {
    const body = await req.json()
    const sessionId = String(body.sessionId || '').trim()
    const surveyId = String(body.surveyId || 'post_task').trim()
    const answers = Array.isArray(body.answers) ? body.answers : []

    if (!sessionId) return NextResponse.json({error: 'Missing sessionId'}, {status: 400})
    if (!answers.length) return NextResponse.json({status: 'ok', inserted: 0})

    const sb = supabaseServer()
    const {data: session, error: sessionError} = await sb
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError) throw sessionError
    if (!session) return NextResponse.json({error: 'Session not found'}, {status: 404})

    let flowStepRunId = body.flowStepRunId || null
    let flowStepId = body.flowStepId || null
    let flowStepOrder = Number.isFinite(Number(body.flowStepOrder)) ? Math.max(0, Math.round(Number(body.flowStepOrder))) : null

    if ((!flowStepRunId || !flowStepId) && body.taskRunId) {
      const {data: taskRun} = await sb
        .from('task_runs')
        .select('flowStepRunId, flowStepId, flowStepOrder')
        .eq('id', body.taskRunId)
        .maybeSingle()
      flowStepRunId = flowStepRunId || taskRun?.flowStepRunId || null
      flowStepId = flowStepId || taskRun?.flowStepId || null
      flowStepOrder = flowStepOrder ?? taskRun?.flowStepOrder ?? null
    }

    const rows = answers
      .filter((answer) => answer?.questionId && answer?.questionType)
      .map((answer, index) => ({
        studyId: session.studyId,
        sessionId,
        taskRunId: body.taskRunId || null,
        flowStepRunId,
        flowStepId,
        flowStepOrder,
        surveyId,
        questionId: String(answer.questionId),
        questionType: String(answer.questionType),
        questionOrder: Number.isFinite(Number(answer.questionOrder)) ? Math.max(0, Math.round(Number(answer.questionOrder))) : index + 1,
        answerText: typeof answer.answerText === 'string' ? answer.answerText : null,
        answerNumber: Number.isFinite(Number(answer.answerNumber)) ? Number(answer.answerNumber) : null,
        answerJson: answer.answerJson ?? null,
      }))

    if (!rows.length) return NextResponse.json({status: 'ok', inserted: 0})

    const {error} = await sb.from('survey_responses').insert(rows)
    if (error) throw error

    return NextResponse.json({status: 'ok', inserted: rows.length})
  } catch (e) {
    return NextResponse.json({error: 'Server error', detail: String(e?.message || e)}, {status: 500})
  }
}
