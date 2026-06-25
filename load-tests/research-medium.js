import http from 'k6/http'
import {check, sleep} from 'k6'

const BASE_URL = (__ENV.BASE_URL || 'https://www.farhanje.com').replace(/\/$/, '')
const STUDY_SLUG = __ENV.STUDY_SLUG || 'ai-support'
const CLICKS_PER_TASK = Number(__ENV.CLICKS_PER_TASK || 3)

export const options = {
  scenarios: {
    medium: {
      executor: 'ramping-vus',
      stages: [
        {duration: '30s', target: 10},
        {duration: '1m', target: 25},
        {duration: '1m', target: 50},
        {duration: '30s', target: 0},
      ],
    },
  },
}

function jsonHeaders() {
  return {headers: {'content-type': 'application/json'}}
}

function logFailure(label, response) {
  if (response.status >= 200 && response.status < 300) return
  const body = String(response.body || '').slice(0, 600)
  console.error(`${label} failed | status=${response.status} | body=${body}`)
}

function postJson(path, body, label = path) {
  const response = http.post(`${BASE_URL}${path}`, JSON.stringify(body), jsonHeaders())
  logFailure(label, response)
  return response
}

function getJson(path, label = path) {
  const response = http.get(`${BASE_URL}${path}`)
  logFailure(label, response)
  return response
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
  const deviceId = `k6-medium-${Date.now()}-${__VU}-${__ITER}-${Math.random().toString(36).slice(2)}`

  const startRes = postJson('/api/research/start', {
    studySlug: STUDY_SLUG,
    deviceId,
    meta: {
      ua: 'k6-medium-test',
      lang: 'en-US',
      tz: 'Asia/Jakarta',
      viewport: {width: 1440, height: 900, devicePixelRatio: 1},
    },
  }, 'start')

  check(startRes, {'start ok': (res) => res.status === 200})

  const start = safeJson(startRes)
  if (!start?.sessionId || start.status === 'completed') return

  sleep(0.5)

  const configRes = getJson(`/api/research/config?studySlug=${encodeURIComponent(STUDY_SLUG)}`, 'config')
  check(configRes, {'config ok': (res) => res.status === 200})

  const config = safeJson(configRes)
  const variant = pickVariant(config?.study, start.variant)
  const task = findFirstTask(variant)

  if (!task?.taskId) {
    console.warn(`No task found for variant=${start.variant}. Completing session without task simulation.`)
    postJson('/api/research/complete', {sessionId: start.sessionId}, 'complete-empty-session')
    return
  }

  sleep(0.5)

  const taskStartRes = postJson('/api/research/task/start', {
    sessionId: start.sessionId,
    taskId: task.taskId,
    taskOrder: 1,
  }, 'task-start')

  check(taskStartRes, {'task start ok': (res) => res.status === 200})

  const taskStart = safeJson(taskStartRes)
  const screen = task.screens?.[0]

  for (let i = 0; i < CLICKS_PER_TASK; i += 1) {
    if (!screen?.screenId) break
    const eventRes = postJson('/api/research/event', {
      sessionId: start.sessionId,
      taskRunId: taskStart?.taskRunId || null,
      screenId: screen.screenId,
      eventType: 'click',
      x: Math.random(),
      y: Math.random(),
      isMisclick: i > 0,
      meta: {source: 'k6-medium', clickIndex: i},
    }, 'event')
    check(eventRes, {'event ok': (res) => res.status === 200})
    sleep(0.1)
  }

  if (taskStart?.taskRunId) {
    const completeTaskRes = postJson('/api/research/task/complete', {
      taskRunId: taskStart.taskRunId,
      success: true,
      attempts: Math.max(1, CLICKS_PER_TASK),
      misclickCount: Math.max(0, CLICKS_PER_TASK - 1),
      durationMs: 5000,
    }, 'task-complete')

    check(completeTaskRes, {'task complete ok': (res) => res.status === 200})
  }

  sleep(0.5)

  const completeRes = postJson('/api/research/complete', {sessionId: start.sessionId}, 'session-complete')
  check(completeRes, {'session complete ok': (res) => res.status === 200})

  sleep(0.5)
}
