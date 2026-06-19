import {NextResponse} from 'next/server'
import {supabaseServer} from '@/lib/supabase.server'

const DATASETS = {
  sessions: {
    table: 'sessions',
    filename: 'sessions.csv',
    order: ['createdAt', {ascending: true}],
    columns: [
      'id', 'studyId', 'tokenId', 'variant', 'completionStatus',
      'researchType', 'sanityRevision', 'deviceViewport', 'startedAt',
      'endedAt', 'createdAt', 'updatedAt', 'configSnapshot',
    ],
  },
  flow_steps: {
    table: 'flow_step_runs',
    filename: 'flow_steps.csv',
    order: ['stepOrder', {ascending: true}],
    columns: [
      'id', 'studyId', 'sessionId', 'variant', 'stepOrder', 'stepId',
      'stepType', 'status', 'startedAt', 'endedAt', 'durationMs', 'meta',
    ],
  },
  task_runs: {
    table: 'task_runs',
    filename: 'task_runs.csv',
    order: ['startedAt', {ascending: true}],
    columns: [
      'id', 'studyId', 'sessionId', 'flowStepRunId', 'flowStepId',
      'flowStepOrder', 'taskId', 'taskOrder', 'startedAt', 'endedAt',
      'durationMs', 'success', 'attempts', 'misclickCount', 'createdAt',
    ],
  },
  screen_events: {
    table: 'screen_events',
    filename: 'screen_events.csv',
    order: ['createdAt', {ascending: true}],
    columns: [
      'id', 'studyId', 'sessionId', 'taskRunId', 'flowStepRunId',
      'flowStepId', 'flowStepOrder', 'screenId', 'eventType', 'x', 'y',
      'targetHotspotId', 'isMisclick', 'meta', 'createdAt',
    ],
  },
  survey_responses: {
    table: 'survey_responses',
    filename: 'survey_responses.csv',
    order: ['createdAt', {ascending: true}],
    columns: [
      'id', 'studyId', 'sessionId', 'taskRunId', 'flowStepRunId',
      'flowStepId', 'flowStepOrder', 'surveyId', 'questionOrder',
      'questionId', 'questionType', 'answerText', 'answerNumber',
      'answerJson', 'createdAt',
    ],
  },
}

function isAuthorized(req) {
  const expected = process.env.RESEARCH_ADMIN_KEY
  const url = new URL(req.url)
  const provided = url.searchParams.get('key') || req.headers.get('x-research-admin-key')

  if (expected) return provided === expected

  // Prevent exposing participant data on production by accident.
  return process.env.NODE_ENV !== 'production'
}

function csvEscape(value) {
  if (value === null || value === undefined) return ''
  const raw = typeof value === 'object' ? JSON.stringify(value) : String(value)
  const normalized = raw.replace(/\r?\n/g, ' ')
  if (/[",\n]/.test(normalized)) return `"${normalized.replace(/"/g, '""')}"`
  return normalized
}

function collectColumns(rows, preferred = []) {
  const seen = new Set(preferred)
  for (const row of rows || []) {
    Object.keys(row || {}).forEach((key) => seen.add(key))
  }
  return Array.from(seen)
}

function toCsv(rows, preferredColumns = []) {
  const columns = collectColumns(rows, preferredColumns)
  const header = columns.map(csvEscape).join(',')
  const body = (rows || []).map((row) => columns.map((col) => csvEscape(row?.[col])).join(','))
  return [header, ...body].join('\n')
}

function jsonResponse(payload, status = 200) {
  return NextResponse.json(payload, {status})
}

export async function GET(req) {
  try {
    if (!isAuthorized(req)) {
      const hasKey = Boolean(process.env.RESEARCH_ADMIN_KEY)
      return jsonResponse({
        error: 'Unauthorized',
        detail: hasKey
          ? 'Add the correct export key.'
          : 'Set RESEARCH_ADMIN_KEY in Vercel before exporting production data.',
      }, 401)
    }

    const url = new URL(req.url)
    const studySlug = String(url.searchParams.get('studySlug') || '').trim()
    const datasetKey = String(url.searchParams.get('dataset') || 'sessions').trim()
    const dataset = DATASETS[datasetKey]

    if (!studySlug) return jsonResponse({error: 'Missing studySlug'}, 400)
    if (!dataset) return jsonResponse({error: 'Invalid dataset', allowed: Object.keys(DATASETS)}, 400)

    const sb = supabaseServer()
    const {data: study, error: studyError} = await sb
      .from('studies')
      .select('*')
      .eq('slug', studySlug)
      .maybeSingle()

    if (studyError) throw studyError
    if (!study) return jsonResponse({error: 'Study not found'}, 404)

    let query = sb.from(dataset.table).select('*').eq('studyId', study.id)
    if (dataset.order) query = query.order(dataset.order[0], dataset.order[1])

    const {data, error} = await query
    if (error) throw error

    const csv = toCsv(data || [], dataset.columns)
    const safeSlug = studySlug.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()
    const filename = `${safeSlug}-${dataset.filename}`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': 'no-store',
      },
    })
  } catch (e) {
    return jsonResponse({error: 'Export failed', detail: String(e?.message || e)}, 500)
  }
}
