import http from 'k6/http'
import {check, sleep} from 'k6'

const BASE_URL = (__ENV.BASE_URL || 'https://www.farhanje.com').replace(/\/$/, '')
const STUDY_SLUG = __ENV.STUDY_SLUG || 'ai-support'
const CLICKS_PER_TASK = Number(__ENV.CLICKS_PER_TASK || 3)

export const options = {
  scenarios: {
    smoke: {
      executor: 'ramping-vus',
      stages: [
        {duration: '15s', target: 2},
        {duration: '30s', target: 5},
        {duration: '15s', target: 0},
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1500'],
  },
}

function jsonHeaders() {
  return {headers: {'content-type': 'application/json'}}
}

function postJson(path, body) {
  return http.post(`${BASE_URL}${path}`, JSON.stringify(body), jsonHeaders())
}

function getJson(path) {
  return http.get(`${BASE_URL}${path}`)
}

function pickVariant(study, assignedVariant) {
  const variants = study?.variants || []
  return variants.find((item) => item.key === assignedVariant) || variants[0] || null
}

function normalizeTask(step, index) {
  if (!step) return null
  return {
    taskId: step.taskId || step._key || `task_${index + 1}`,
    screens: step.screens || [],
  }
}

function findFirstTask(variant) {
  const flowSteps = variant?.flowSteps || []
  for (let index = 0; index < flowSteps.length; index += 1) {
    const step = flowSteps[index]
    if (step.stepType !== 'question') return normalizeTask(step, index)
  }

  const tasks = variant?.tasks || []
  return tasks.length ? normalizeTask(tasks[0], 0) : null
}

function safeJson(response) {
  try {
    return response.json()
  } catch (_) {
    return null
  }
}

export default function () {
  const deviceId = `k6-smoke-${Date.now()}-${__VU}-${__ITER}-${Math.random().toString(36).slice(2)}`

  const startRes = postJson('/api/research/start', {
    studySlug: STUDY_SLUG,
    deviceId,
    meta: {
      ua: 'k6-smoke-test',
      lang: 'en-US',
      tz: 'Asia/Jakarta',
      viewport: {width: 1440, height: 900, devicePixelRatio: 1},
    },
  })

  check(startRes, {
    'start ok': (res) => res.status === 200,
  })

  const start = safeJson(startRes)
  if (!start?.sessionId || start.status === 'completed') return

  const configRes = getJson(`/api/research/config?studySlug=${encodeURIComponent(STUDY_SLUG)}`)
  check(configRes, {
    'config ok': (res) => res.status === 200,
  })

  const config = safeJson(configRes)
  const variant = pickVariant(config?.study, start.variant)
  const task = findFirstTask(variant)

  if (!task?.taskId) {
    postJson('/api/research/complete', {sessionId: start.sessionId})
    return
  }

  const taskStartRes = postJson('/api/research/task/start', {
    sessionId: start.sessionId,
    taskId: task.taskId,
    taskOrder: 1,
  })

  check(taskStartRes, {
    'task start ok': (res) => res.status === 200,
  })

  const taskStart = safeJson(taskStartRes)
  const screen = task.screens?.[0]

  for (let i = 0; i < CLICKS_PER_TASK; i += 1) {
    if (!screen?.screenId) break
    postJson('/api/research/event', {
      sessionId: start.sessionId,
      taskRunId: taskStart?.taskRunId || null,
      screenId: screen.screenId,
      eventType: 'click',
      x: Math.random(),
      y: Math.random(),
      isMisclick: i > 0,
      meta: {source: 'k6-smoke', clickIndex: i},
    })
  }

  if (taskStart?.taskRunId) {
    const completeTaskRes = postJson('/api/research/task/complete', {
      taskRunId: taskStart.taskRunId,
      success: true,
      attempts: Math.max(1, CLICKS_PER_TASK),
      misclickCount: Math.max(0, CLICKS_PER_TASK - 1),
      durationMs: 2500,
    })

    check(completeTaskRes, {
      'task complete ok': (res) => res.status === 200,
    })
  }

  const completeRes = postJson('/api/research/complete', {sessionId: start.sessionId})
  check(completeRes, {
    'session complete ok': (res) => res.status === 200,
  })

  sleep(1)
}
