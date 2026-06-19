import {NextResponse} from 'next/server'
import {timingSafeEqual} from 'crypto'
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

function safeCompare(a = '', b = '') {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function isAuthorized(provided) {
  const expected = process.env.RESEARCH_ADMIN_KEY

  if (expected) return safeCompare(provided, expected)

  // Never expose participant data in production by accident.
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
  return NextResponse.json(payload, {
    status,
    headers: {
      'cache-control': 'no-store, max-age=0',
      'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet',
    },
  })
}

export async function GET() {
  return jsonResponse({error: 'Method not allowed. Use POST.'}, 405)
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}))
    const providedKey = String(body?.key || body?.exportKey || req.headers.get('x-research-admin-key') || '')

    if (!isAuthorized(providedKey)) {
      const hasKey = Boolean(process.env.RESEARCH_ADMIN_KEY)
      return jsonResponse({
        error: 'Unauthorized',
        detail: hasKey
          ? 'Add the correct export key.'
          : 'Set RESEARCH_ADMIN_KEY in Vercel before exporting production data.',
      }, 401)
    }

    const studySlug = String(body?.studySlug || '').trim()
    const datasetKey = String(body?.dataset || 'sessions').trim()
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
        'cache-control': 'no-store, max-age=0',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
        'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet',
      },
    })
  } catch (e) {
    return jsonResponse({error: 'Export failed', detail: String(e?.message || e)}, 500)
  }
}
