'use client'

import {useEffect, useMemo, useRef, useState} from 'react'

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.detail || json?.error || 'Request failed')
  return json
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function findHit(hotspots = [], x, y) {
  return hotspots.find((hotspot) => {
    const hx = Number(hotspot.x)
    const hy = Number(hotspot.y)
    const hw = Number(hotspot.w)
    const hh = Number(hotspot.h)
    return x >= hx && x <= hx + hw && y >= hy && y <= hy + hh
  })
}

function questionKey(question) {
  return question?.questionId || question?._key
}

function toSurveyRows(answers, questions) {
  return questions.map((question, index) => {
    const key = questionKey(question)
    const value = answers[key]
    const base = {
      questionId: key,
      questionType: question.type,
      questionOrder: index + 1,
      answerText: null,
      answerNumber: null,
      answerJson: null,
    }

    if (question.type === 'likert' || question.type === 'number') {
      return {...base, answerNumber: Number.isFinite(Number(value)) ? Number(value) : null}
    }

    if (question.type === 'multi') {
      return {...base, answerJson: Array.isArray(value) ? value : []}
    }

    if (question.type === 'single') {
      return {...base, answerText: typeof value === 'string' ? value : null}
    }

    return {...base, answerText: typeof value === 'string' ? value : ''}
  })
}

function destinationDelayMs(screen) {
  const seconds = Number(screen?.completionDelaySeconds)
  const safeSeconds = Number.isFinite(seconds) ? seconds : 1.5
  return Math.min(10000, Math.max(200, safeSeconds * 1000))
}

function mediaFields(source = {}) {
  return {
    mediaType: source.mediaType || 'none',
    mediaImageUrl: source.mediaImageUrl || null,
    mediaUrl: source.mediaUrl || null,
    mediaCaption: source.mediaCaption || null,
  }
}

function normalizeTaskStep(step, index) {
  const taskId = step.taskId || step._key || `task_${index + 1}`
  return {
    kind: 'task',
    stepId: taskId,
    task: {
      taskId,
      title: cleanText(step.stepTitle) || cleanText(step.title),
      scenario: cleanText(step.scenario),
      screens: step.screens || [],
      postTaskSurvey: step.postTaskSurvey || [],
    },
  }
}

function normalizeQuestionStep(step, index) {
  const id = step.questionId || step._key || `question_${index + 1}`
  return {
    kind: 'question',
    stepId: id,
    title: cleanText(step.stepTitle),
    question: {
      questionId: id,
      label: cleanText(step.label),
      type: step.type || 'likert',
      required: Boolean(step.required),
      minLabel: step.minLabel,
      maxLabel: step.maxLabel,
      options: step.options || [],
      ...mediaFields(step),
    },
  }
}

function normalizeFlowStep(step, index) {
  if (step.stepType === 'question') return normalizeQuestionStep(step, index)
  return normalizeTaskStep(step, index)
}

function getEmbedUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null

  try {
    const url = new URL(rawUrl)
    if (!['http:', 'https:'].includes(url.protocol)) return null

    const host = url.hostname.replace(/^www\./, '')
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = url.searchParams.get('v')
      if (id) return `https://www.youtube.com/embed/${id}`
    }

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      if (id) return `https://www.youtube.com/embed/${id}`
    }

    if (host === 'vimeo.com') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      if (id) return `https://player.vimeo.com/video/${id}`
    }

    if (host === 'loom.com' && url.pathname.includes('/share/')) {
      const id = url.pathname.split('/').filter(Boolean).pop()
      if (id) return `https://www.loom.com/embed/${id}`
    }

    return rawUrl
  } catch {
    return null
  }
}

function safeProgress(value) {
  if (!value || typeof value !== 'object') return null
  const phase = ['intro', 'taskBrief', 'task', 'postTaskSurvey', 'flowQuestion'].includes(value.phase) ? value.phase : 'intro'
  return {
    phase,
    stepIndex: Number.isFinite(Number(value.stepIndex)) ? Math.max(0, Math.round(Number(value.stepIndex))) : 0,
    screenIndex: Number.isFinite(Number(value.screenIndex)) ? Math.max(0, Math.round(Number(value.screenIndex))) : 0,
    taskRunId: typeof value.taskRunId === 'string' ? value.taskRunId : null,
    taskStartedAt: Number.isFinite(Number(value.taskStartedAt)) ? Number(value.taskStartedAt) : null,
    attempts: Number.isFinite(Number(value.attempts)) ? Math.max(0, Math.round(Number(value.attempts))) : 0,
    misclickCount: Number.isFinite(Number(value.misclickCount)) ? Math.max(0, Math.round(Number(value.misclickCount))) : 0,
    surveyAnswers: value.surveyAnswers && typeof value.surveyAnswers === 'object' ? value.surveyAnswers : {},
    taskPanelOpen: typeof value.taskPanelOpen === 'boolean' ? value.taskPanelOpen : true,
  }
}

export default function ResearchRunner({studySlug, session}) {
  const imageRef = useRef(null)
  const destinationCompletionRef = useRef(null)
  const progressHydratedRef = useRef(false)
  const progressTimerRef = useRef(null)
  const [configState, setConfigState] = useState({status: 'loading'})
  const [phase, setPhase] = useState('intro')
  const [stepIndex, setStepIndex] = useState(0)
  const [screenIndex, setScreenIndex] = useState(0)
  const [taskRunId, setTaskRunId] = useState(null)
  const [taskStartedAt, setTaskStartedAt] = useState(null)
  const [attempts, setAttempts] = useState(0)
  const [misclickCount, setMisclickCount] = useState(0)
  const [surveyAnswers, setSurveyAnswers] = useState({})
  const [validationErrors, setValidationErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [imageMeta, setImageMeta] = useState(null)
  const [taskPanelOpen, setTaskPanelOpen] = useState(true)
  const [feedback, setFeedback] = useState(null)

  const progressKey = session?.sessionId ? `vertolio_research_progress_${session.sessionId}` : null

  useEffect(() => {
    if (!studySlug) return

    const run = async () => {
      setConfigState({status: 'loading'})
      const res = await fetch(`/api/research/config?studySlug=${encodeURIComponent(studySlug)}`)
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setConfigState({status: 'error', error: json?.error || 'Study config could not be loaded'})
        return
      }

      setConfigState({status: 'ready', study: json.study})
    }

    run().catch((err) => setConfigState({status: 'error', error: err.message}))
  }, [studySlug])

  const study = configState.study
  const variant = useMemo(() => {
    if (!study?.variants?.length) return null
    return study.variants.find((item) => item.key === session.variant) || study.variants[0]
  }, [study, session.variant])

  const steps = useMemo(() => {
    if (!variant) return []
    if (Array.isArray(variant.flowSteps) && variant.flowSteps.length) {
      return variant.flowSteps.map(normalizeFlowStep)
    }
    return (variant.tasks || []).map(normalizeTaskStep)
  }, [variant])

  const step = steps[stepIndex]
  const task = step?.kind === 'task' ? step.task : null
  const screen = task?.screens?.[screenIndex]
  const postTaskQuestions = task?.postTaskSurvey || []
  const flowQuestion = step?.kind === 'question' ? step.question : null
  const taskNumber = steps.slice(0, stepIndex + 1).filter((item) => item.kind === 'task').length
  const totalTasks = steps.filter((item) => item.kind === 'task').length
  const destinationReached = phase === 'task' && Boolean(screen?.isDestination)

  useEffect(() => {
    setImageMeta(null)
  }, [screen?.screenId, screen?.imageUrl])

  useEffect(() => {
    if (!steps.length || progressHydratedRef.current) return

    let restored = null
    if (session?.progressState) restored = safeProgress(session.progressState)

    if (!restored && progressKey) {
      try {
        restored = safeProgress(JSON.parse(window.localStorage.getItem(progressKey) || 'null'))
      } catch {
        restored = null
      }
    }

    if (restored && restored.stepIndex < steps.length) {
      const restoredStep = steps[restored.stepIndex]
      const restoredTask = restoredStep?.kind === 'task' ? restoredStep.task : null
      const safeScreenIndex = restoredTask?.screens?.length
        ? Math.min(restored.screenIndex, restoredTask.screens.length - 1)
        : 0
      const safePhase = restored.phase === 'task' && !restored.taskRunId
        ? 'taskBrief'
        : restored.phase

      setStepIndex(restored.stepIndex)
      setScreenIndex(safeScreenIndex)
      setTaskRunId(restored.taskRunId)
      setTaskStartedAt(restored.taskStartedAt)
      setAttempts(restored.attempts)
      setMisclickCount(restored.misclickCount)
      setSurveyAnswers(restored.surveyAnswers)
      setTaskPanelOpen(restored.taskPanelOpen)
      setPhase(safePhase)
    }

    progressHydratedRef.current = true
  }, [steps, session?.progressState, progressKey])

  useEffect(() => {
    if (!progressHydratedRef.current || !progressKey || phase === 'done') return

    const payload = {
      studySlug,
      variant: session.variant,
      phase,
      stepIndex,
      screenIndex,
      taskRunId,
      taskStartedAt,
      attempts,
      misclickCount,
      surveyAnswers,
      taskPanelOpen,
      updatedAt: new Date().toISOString(),
    }

    window.localStorage.setItem(progressKey, JSON.stringify(payload))

    if (progressTimerRef.current) window.clearTimeout(progressTimerRef.current)
    progressTimerRef.current = window.setTimeout(() => {
      postJson('/api/research/session/progress', {
        sessionId: session.sessionId,
        progressState: payload,
      }).catch(() => {})
    }, 450)

    return () => {
      if (progressTimerRef.current) window.clearTimeout(progressTimerRef.current)
    }
  }, [
    progressKey,
    phase,
    stepIndex,
    screenIndex,
    taskRunId,
    taskStartedAt,
    attempts,
    misclickCount,
    surveyAnswers,
    taskPanelOpen,
    session.sessionId,
    session.variant,
    studySlug,
  ])

  function resetStepState() {
    destinationCompletionRef.current = null
    setScreenIndex(0)
    setTaskRunId(null)
    setTaskStartedAt(null)
    setAttempts(0)
    setMisclickCount(0)
    setSurveyAnswers({})
    setValidationErrors({})
    setTaskPanelOpen(true)
    setFeedback(null)
    setError(null)
  }

  function prepareStep(nextIndex) {
    const nextStep = steps[nextIndex]
    if (!nextStep) {
      completeStudy()
      return
    }

    resetStepState()
    setStepIndex(nextIndex)
    setPhase(nextStep.kind === 'question' ? 'flowQuestion' : 'taskBrief')
  }

  async function goNextStep() {
    const nextIndex = stepIndex + 1
    if (nextIndex >= steps.length) await completeStudy()
    else prepareStep(nextIndex)
  }

  async function beginTask() {
    if (!task) return

    setBusy(true)
    setError(null)

    try {
      const json = await postJson('/api/research/task/start', {
        sessionId: session.sessionId,
        taskId: task.taskId,
        taskOrder: taskNumber || 1,
      })

      destinationCompletionRef.current = null
      setTaskRunId(json.taskRunId)
      setTaskStartedAt(Date.now())
      setAttempts(0)
      setMisclickCount(0)
      setTaskPanelOpen(false)
      setFeedback(null)
      setPhase('task')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function logScreenEvent(payload) {
    try {
      await postJson('/api/research/event', {
        sessionId: session.sessionId,
        taskRunId,
        ...payload,
      })
    } catch (err) {
      console.error(err)
    }
  }

  async function finishTask({success, finalAttempts = attempts, finalMisclickCount = misclickCount, status = 'completed', skipPostTaskSurvey = false}) {
    if (!taskRunId) return

    setBusy(true)
    setError(null)

    try {
      await postJson('/api/research/task/complete', {
        taskRunId,
        success,
        status,
        skipped: status === 'skipped',
        attempts: finalAttempts,
        misclickCount: finalMisclickCount,
        durationMs: taskStartedAt ? Date.now() - taskStartedAt : null,
      })

      setFeedback(null)
      if (!skipPostTaskSurvey && postTaskQuestions.length) {
        setSurveyAnswers({})
        setValidationErrors({})
        setPhase('postTaskSurvey')
      } else {
        await goNextStep()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function skipTask() {
    if (!taskRunId || busy) return

    const confirmed = window.confirm('Skip this task and continue to the next part? This will be recorded as skipped.')
    if (!confirmed) return

    await finishTask({
      success: false,
      status: 'skipped',
      skipPostTaskSurvey: true,
    })
  }

  async function completeStudy() {
    setBusy(true)
    setError(null)

    try {
      await postJson('/api/research/complete', {sessionId: session.sessionId})
      if (progressKey) window.localStorage.removeItem(progressKey)
      setPhase('done')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (phase !== 'task' || !taskRunId || !screen?.isDestination) return undefined

    const completionKey = `${taskRunId}:${screen.screenId}`
    if (destinationCompletionRef.current === completionKey) return undefined

    const timer = window.setTimeout(() => {
      if (destinationCompletionRef.current === completionKey) return
      destinationCompletionRef.current = completionKey
      finishTask({success: true})
    }, destinationDelayMs(screen))

    return () => window.clearTimeout(timer)
  }, [phase, taskRunId, screen?.screenId, screen?.isDestination, screen?.completionDelaySeconds])

  function pulse(type) {
    setFeedback(type)
    window.setTimeout(() => setFeedback(null), 180)
  }

  function handleScreenClick(event) {
    if (phase !== 'task' || !taskRunId || !screen || busy) return

    const bounds = imageRef.current?.getBoundingClientRect()
    if (!bounds) return

    const rawX = (event.clientX - bounds.left) / bounds.width
    const rawY = (event.clientY - bounds.top) / bounds.height
    if (rawX < 0 || rawX > 1 || rawY < 0 || rawY > 1) return

    const x = clamp01(rawX)
    const y = clamp01(rawY)
    const hit = findHit(screen.hotspots || [], x, y)
    const isMisclick = !hit || hit.isCorrect === false
    const nextAttempts = attempts + 1
    const nextMisclickCount = misclickCount + (isMisclick ? 1 : 0)

    setAttempts(nextAttempts)
    setMisclickCount(nextMisclickCount)
    pulse(isMisclick ? 'miss' : 'hit')

    void logScreenEvent({
      screenId: screen.screenId,
      eventType: 'click',
      x,
      y,
      targetHotspotId: hit?.hotspotId || null,
      isMisclick,
      meta: hit
        ? {hotspotLabel: hit.label || null, action: hit.action || null, taskId: task.taskId}
        : {taskId: task.taskId},
    })

    if (!hit) return

    if (hit.action === 'goToScreen' && hit.targetScreenId) {
      const targetIndex = (task.screens || []).findIndex((item) => item.screenId === hit.targetScreenId)
      if (targetIndex >= 0) setScreenIndex(targetIndex)
      return
    }

    if (hit.action === 'back') {
      setScreenIndex((current) => Math.max(0, current - 1))
      return
    }

    if (hit.action === 'completeTask') {
      finishTask({success: !isMisclick, finalAttempts: nextAttempts, finalMisclickCount: nextMisclickCount})
      return
    }

    setScreenIndex((current) => Math.min((task.screens?.length || 1) - 1, current + 1))
  }

  function clearValidation(question) {
    const key = questionKey(question)
    setValidationErrors((current) => {
      if (!current[key]) return current
      const next = {...current}
      delete next[key]
      return next
    })
  }

  function setAnswer(question, value) {
    clearValidation(question)
    setSurveyAnswers((current) => ({...current, [questionKey(question)]: value}))
  }

  function toggleMulti(question, option) {
    const key = questionKey(question)
    clearValidation(question)
    setSurveyAnswers((current) => {
      const previous = Array.isArray(current[key]) ? current[key] : []
      const next = previous.includes(option) ? previous.filter((item) => item !== option) : [...previous, option]
      return {...current, [key]: next}
    })
  }

  function getRequiredErrors(questions) {
    const nextErrors = {}
    for (const question of questions) {
      if (!question.required) continue
      const key = questionKey(question)
      const value = surveyAnswers[key]
      const missing = question.type === 'multi'
        ? !Array.isArray(value) || value.length === 0
        : value === undefined || value === null || value === ''
      if (missing) nextErrors[key] = 'This question is required.'
    }
    return nextErrors
  }

  async function submitQuestions({questions, surveyId, next, scopedTaskRunId = null}) {
    const nextValidationErrors = getRequiredErrors(questions)
    if (Object.keys(nextValidationErrors).length) {
      setValidationErrors(nextValidationErrors)
      setError('Please complete the required question before continuing.')
      return
    }

    setBusy(true)
    setError(null)
    setValidationErrors({})

    try {
      await postJson('/api/research/survey', {
        sessionId: session.sessionId,
        taskRunId: scopedTaskRunId,
        surveyId,
        answers: toSurveyRows(surveyAnswers, questions),
      })
      setSurveyAnswers({})
      await next()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function renderQuestionMedia(question) {
    const type = question?.mediaType || 'none'

    if (type === 'image' && question.mediaImageUrl) {
      return (
        <figure className="research-question-media">
          <img src={question.mediaImageUrl} alt={question.mediaCaption || question.label || 'Question image'} />
          {question.mediaCaption ? <figcaption>{question.mediaCaption}</figcaption> : null}
        </figure>
      )
    }

    if (type === 'embed' && question.mediaUrl) {
      const embedUrl = getEmbedUrl(question.mediaUrl)
      if (!embedUrl) return null

      return (
        <figure className="research-question-media">
          <div className="research-question-embed-wrap">
            <iframe
              src={embedUrl}
              title={question.mediaCaption || question.label || 'Question media'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
          </div>
          {question.mediaCaption ? <figcaption>{question.mediaCaption}</figcaption> : null}
        </figure>
      )
    }

    return null
  }

  function renderQuestionControl(question) {
    const key = questionKey(question)

    if (question.type === 'likert') {
      const minLabel = question.minLabel || 'Strongly disagree'
      const maxLabel = question.maxLabel || 'Strongly agree'

      return (
        <div className="research-question-control">
          <div className="research-likert-scale" role="radiogroup" aria-label={question.label || 'Question'}>
            <div className="research-likert-options">
              {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                <label key={value} className="research-likert-option">
                  <span>{value}</span>
                  <input type="radio" name={key} checked={surveyAnswers[key] === value} onChange={() => setAnswer(question, value)} />
                </label>
              ))}
            </div>
            <div className="research-likert-anchors" aria-hidden="true">
              <span>{minLabel}</span>
              <span>{maxLabel}</span>
            </div>
          </div>
        </div>
      )
    }

    if (question.type === 'single') {
      return (
        <div className="research-choice-list">
          {(question.options || []).map((option) => (
            <label key={option}>
              <input type="radio" name={key} checked={surveyAnswers[key] === option} onChange={() => setAnswer(question, option)} />
              {option}
            </label>
          ))}
        </div>
      )
    }

    if (question.type === 'multi') {
      return (
        <div className="research-choice-list">
          {(question.options || []).map((option) => (
            <label key={option}>
              <input type="checkbox" checked={(surveyAnswers[key] || []).includes(option)} onChange={() => toggleMulti(question, option)} />
              {option}
            </label>
          ))}
        </div>
      )
    }

    if (question.type === 'number') {
      return <input className="research-form-field" type="number" value={surveyAnswers[key] || ''} onChange={(event) => setAnswer(question, event.target.value)} />
    }

    return <textarea className="research-form-field" value={surveyAnswers[key] || ''} onChange={(event) => setAnswer(question, event.target.value)} rows={4} />
  }

  function renderQuestionPage({title, subtitle, questions, onSubmit}) {
    return (
      <section className="section tight">
        <div className="kicker"><span className="dot" /> Research</div>
        {title ? <h1 style={{marginTop: 12}}>{title}</h1> : null}
        {subtitle ? <p className="lead" style={{marginTop: 8}}>{subtitle}</p> : null}
        <div className="research-question-stack">
          {questions.map((question) => {
            const key = questionKey(question)
            const helper = validationErrors[key]
            return (
              <div className={`research-question-card ${helper ? 'has-error' : ''}`} key={key}>
                {question.label ? <p className="research-question-label">{question.label}{question.required ? ' *' : ''}</p> : null}
                {renderQuestionMedia(question)}
                {renderQuestionControl(question)}
                {helper ? <p className="research-question-error">{helper}</p> : null}
              </div>
            )
          })}
        </div>
        {error ? <p style={{marginTop: 18}}>{error}</p> : null}
        <button className="btn" type="button" disabled={busy} onClick={onSubmit} style={{marginTop: 32}}>
          {busy ? 'Saving…' : 'Continue'}
        </button>
        {questionCss()}
      </section>
    )
  }

  function renderPrototypeStage({dimmed = false} = {}) {
    const orientation = imageMeta?.width && imageMeta?.height && imageMeta.width >= imageMeta.height
      ? 'is-landscape-image'
      : 'is-portrait-image'

    return (
      <main className={`research-prototype-stage ${orientation} ${dimmed ? 'is-dimmed' : ''} ${feedback ? `is-${feedback}` : ''} ${destinationReached ? 'is-destination' : ''}`}>
        {screen?.imageUrl ? (
          <img
            ref={imageRef}
            src={screen.imageUrl}
            alt={screen.alt || screen.title || 'Prototype screen'}
            draggable="false"
            onLoad={(event) => {
              const img = event.currentTarget
              setImageMeta({width: img.naturalWidth, height: img.naturalHeight})
            }}
            onClick={handleScreenClick}
            role={phase === 'task' ? 'button' : undefined}
            tabIndex={phase === 'task' ? 0 : -1}
            aria-label={screen.alt || screen.title || 'Prototype screen'}
            className="research-prototype-image"
          />
        ) : (
          <div className="research-prototype-empty"><p>This screen is missing its PNG image.</p></div>
        )}
        {destinationReached ? (
          <div className="research-destination-overlay" aria-live="polite">
            <div className="research-destination-card">
              <span className="research-destination-check">✓</span>
              <strong>Task complete</strong>
              <small>Saving and moving on…</small>
            </div>
          </div>
        ) : null}
      </main>
    )
  }

  function renderTaskPanel() {
    const isStarted = phase === 'task'
    return (
      <aside className="research-instruction-panel" aria-label="Task instruction">
        <div className="research-panel-scroll">
          <p className="research-task-meta">Research task</p>
          <p className="research-task-step">Task {taskNumber || 1} of {Math.max(totalTasks, 1)}</p>
          {task.title ? <h1>{task.title}</h1> : null}
          {task.scenario ? <p className="lead" style={{whiteSpace: 'pre-line'}}>{task.scenario}</p> : null}
          {isStarted ? <p className="research-task-hint">The task is already running. If you are stuck, you may skip this task and continue.</p> : <p className="research-task-hint">The timer starts after you press Start task.</p>}
          {busy ? <p className="research-task-status">Saving…</p> : null}
          {error ? <p className="research-task-error">{error}</p> : null}
        </div>
        <div className="research-panel-actions">
          {!isStarted ? (
            <button className="btn" type="button" disabled={busy || !screen?.imageUrl} onClick={beginTask}>{busy ? 'Starting…' : 'Start task'}</button>
          ) : null}
          {isStarted ? <button className="btn secondary" type="button" onClick={() => setTaskPanelOpen(false)}>Hide task</button> : null}
          {isStarted ? <button className="research-skip-task" type="button" disabled={busy} onClick={skipTask}>I’m stuck — skip task</button> : null}
        </div>
      </aside>
    )
  }

  if (configState.status === 'loading') {
    return (
      <section className="section tight">
        <div className="kicker"><span className="dot" /> Research</div>
        <h1 style={{marginTop: 12}}>Loading study</h1>
        <p className="lead" style={{marginTop: 8}}>Fetching the study config from Sanity.</p>
      </section>
    )
  }

  if (configState.status === 'error') {
    return (
      <section className="section tight">
        <div className="kicker"><span className="dot" /> Research</div>
        <h1 style={{marginTop: 12}}>Session ready</h1>
        <p className="lead" style={{marginTop: 8}}>Session <strong>{session.sessionId}</strong></p>
        <p className="lead" style={{marginTop: 10}}>{configState.error}</p>
      </section>
    )
  }

  if (phase === 'done') {
    return (
      <section className="section tight">
        <div className="kicker"><span className="dot" /> Research</div>
        <h1 style={{marginTop: 12}}>{study.completionTitle || 'Thank you'}</h1>
        <p className="lead" style={{marginTop: 8}}>{study.completionBody || 'Your response has been recorded.'}</p>
      </section>
    )
  }

  if (!variant || !steps.length) {
    return (
      <section className="section tight">
        <div className="kicker"><span className="dot" /> Research</div>
        <h1 style={{marginTop: 12}}>Study is empty</h1>
        <p className="lead" style={{marginTop: 8}}>Add at least one item in Variant → Study flow.</p>
      </section>
    )
  }

  if (phase === 'intro') {
    return (
      <section className="section tight">
        <div className="kicker"><span className="dot" /> Research</div>
        <h1 style={{marginTop: 12}}>{study.introTitle || study.title}</h1>
        {study.introBody ? <p className="lead" style={{marginTop: 8, whiteSpace: 'pre-line'}}>{study.introBody}</p> : null}
        {study.consentText ? <p style={{marginTop: 18, maxWidth: 760, whiteSpace: 'pre-line'}}>{study.consentText}</p> : null}
        {error ? <p style={{marginTop: 16}}>{error}</p> : null}
        <button className="btn" type="button" disabled={busy} onClick={() => prepareStep(0)} style={{marginTop: 28}}>Continue</button>
      </section>
    )
  }

  if (phase === 'flowQuestion') {
    return renderQuestionPage({
      title: step.title,
      subtitle: `Step ${stepIndex + 1} of ${steps.length}`,
      questions: [flowQuestion],
      onSubmit: () => submitQuestions({questions: [flowQuestion], surveyId: `flow_${step.stepId}`, next: goNextStep}),
    })
  }

  if (phase === 'postTaskSurvey') {
    const subtitle = task?.title
      ? `Task ${taskNumber} of ${Math.max(totalTasks, 1)}: ${task.title}`
      : `Task ${taskNumber} of ${Math.max(totalTasks, 1)}`
    return renderQuestionPage({
      title: 'Quick follow-up',
      subtitle,
      questions: postTaskQuestions,
      onSubmit: () => submitQuestions({questions: postTaskQuestions, surveyId: `${task.taskId}_post_task`, scopedTaskRunId: taskRunId, next: goNextStep}),
    })
  }

  const isTaskRunning = phase === 'task'
  const runnerClassName = `research-runner-shell ${taskPanelOpen ? 'is-panel-open' : 'is-panel-closed'} ${isTaskRunning ? 'is-running' : 'is-briefing'}`

  return (
    <section className={runnerClassName}>
      <div className="research-runner-frame">
        {taskPanelOpen ? renderTaskPanel() : null}
        {renderPrototypeStage({dimmed: !isTaskRunning})}
      </div>
      {!taskPanelOpen ? <button className="research-show-task" type="button" onClick={() => setTaskPanelOpen(true)}>Show task</button> : null}
      {runnerCss()}
    </section>
  )
}

function questionCss() {
  return (
    <style>{`
      .research-question-stack { display: grid; gap: 30px; margin-top: 32px; max-width: 860px; }
      .research-question-card { display: grid; gap: 16px; }
      .research-question-label { margin: 0; font-weight: 700; line-height: 1.35; max-width: 760px; }
      .research-question-card.has-error .research-question-label { color: #b00020; }
      .research-question-error { margin: -4px 0 0; color: #b00020; font-size: 0.88rem; line-height: 1.35; }
      .research-question-media { margin: 4px 0 2px; max-width: 760px; }
      .research-question-media img { display: block; width: 100%; max-height: min(52vh, 520px); object-fit: contain; border: 1px solid #e4e4e4; background: #f7f7f7; }
      .research-question-media figcaption { margin-top: 8px; color: #666; font-size: 0.9rem; }
      .research-question-embed-wrap { position: relative; width: 100%; aspect-ratio: 16 / 9; border: 1px solid #e4e4e4; background: #111; overflow: hidden; }
      .research-question-embed-wrap iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
      .research-question-control { max-width: 760px; }
      .research-likert-scale { display: grid; gap: 10px; max-width: 640px; }
      .research-likert-options { display: grid; grid-template-columns: repeat(7, minmax(34px, 1fr)); align-items: end; column-gap: 8px; }
      .research-likert-option { display: grid; justify-items: center; gap: 8px; font-weight: 650; }
      .research-likert-option span { font-size: 0.95rem; }
      .research-likert-option input { margin: 0; }
      .research-likert-anchors { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; max-width: 640px; color: #555; font-size: 0.9rem; line-height: 1.35; }
      .research-likert-anchors span:last-child { text-align: right; }
      .research-choice-list { display: grid; gap: 10px; max-width: 720px; }
      .research-choice-list label { display: inline-flex; align-items: center; gap: 8px; }
      .research-form-field { width: 100%; max-width: 720px; padding: 12px; border: 1px solid #ddd; font: inherit; box-sizing: border-box; }
      .research-question-card.has-error .research-form-field { border-color: #b00020; }
      @media (max-width: 640px) {
        .research-likert-options { grid-template-columns: repeat(7, minmax(28px, 1fr)); column-gap: 4px; }
        .research-likert-anchors { font-size: 0.82rem; }
      }
    `}</style>
  )
}

function runnerCss() {
  return (
    <style>{`
      .research-runner-shell { position: fixed; inset: 0; z-index: 1000; width: 100vw; height: 100dvh; overflow: hidden; background: #0f0f0f; }
      .research-runner-frame { height: 100%; display: grid; grid-template-columns: minmax(300px, min(34vw, 460px)) minmax(0, 1fr); }
      .research-runner-shell.is-panel-closed .research-runner-frame { display: block; width: 100vw; height: 100dvh; overflow: hidden; }
      .research-instruction-panel { height: 100dvh; min-width: 0; box-sizing: border-box; background: #fff; color: #111; border-right: 1px solid #e6e6e6; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
      .research-panel-scroll { min-width: 0; overflow: auto; overflow-x: hidden; padding: clamp(22px, 3vw, 44px) clamp(20px, 2.8vw, 36px); }
      .research-panel-actions { min-width: 0; padding: 18px clamp(20px, 2.8vw, 36px) clamp(20px, 2.8vw, 34px); border-top: 1px solid #eee; display: flex; gap: 12px; flex-wrap: wrap; background: #fff; overflow-x: hidden; }
      .research-panel-scroll > *, .research-panel-actions > * { max-width: 100%; overflow-wrap: anywhere; box-sizing: border-box; }
      .research-task-meta, .research-task-step, .research-task-status, .research-task-error, .research-task-hint { margin-top: 0; max-width: 360px; overflow-wrap: anywhere; }
      .research-task-meta { color: #777; font-size: 0.76rem; letter-spacing: 0.02em; }
      .research-task-step { margin-top: 14px; color: #555; font-size: 0.88rem; }
      .research-instruction-panel h1 { margin-top: 10px; max-width: 360px; font-size: clamp(1.2rem, 1.45vw, 1.65rem); line-height: 1.08; letter-spacing: -0.02em; overflow-wrap: anywhere; word-break: break-word; }
      .research-instruction-panel .lead { margin-top: 18px; max-width: 360px; font-size: clamp(0.95rem, 1.05vw, 1.05rem); line-height: 1.45; }
      .research-task-status, .research-task-error, .research-task-hint { margin-top: 18px; font-size: 0.88rem; }
      .research-task-hint { color: #666; }
      .research-task-error { color: #b00020; }
      .research-skip-task { border: 0; background: transparent; color: #777; text-decoration: underline; font: inherit; cursor: pointer; padding: 10px 0; }
      .research-skip-task:hover { color: #111; }
      .research-skip-task:disabled { opacity: 0.45; cursor: not-allowed; }
      .research-prototype-stage { position: relative; height: 100dvh; width: 100%; box-sizing: border-box; display: grid; place-items: center; padding: clamp(18px, 3.2vw, 56px); background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08), rgba(255,255,255,0) 42%), #101010; overflow: hidden; }
      .research-runner-shell.is-panel-closed .research-prototype-stage { position: fixed; inset: 0; width: 100vw; height: 100dvh; max-width: none; margin: 0; padding: clamp(24px, 4vw, 64px); display: grid; place-items: center; transform: none; z-index: 1000; }
      .research-prototype-stage.is-dimmed .research-prototype-image { opacity: 0.42; filter: saturate(0.8); }
      .research-prototype-stage.is-hit::after, .research-prototype-stage.is-miss::after { content: ""; position: absolute; inset: 0; pointer-events: none; animation: research-feedback 180ms ease-out; }
      .research-prototype-stage.is-hit::after { background: rgba(255,255,255,0.16); }
      .research-prototype-stage.is-miss::after { background: rgba(255,255,255,0.08); }
      .research-prototype-stage.is-destination { background: radial-gradient(circle at 50% 50%, rgba(52,199,89,0.28), rgba(52,199,89,0.08) 44%, rgba(16,16,16,1) 78%), #071b0f; }
      .research-destination-overlay { position: absolute; inset: 0; z-index: 4; display: grid; place-items: center; pointer-events: none; background: rgba(19, 152, 69, 0.2); backdrop-filter: saturate(1.1); }
      .research-destination-card { display: grid; justify-items: center; gap: 6px; padding: 18px 22px; color: #fff; background: rgba(0, 76, 28, 0.72); border: 1px solid rgba(255,255,255,0.28); box-shadow: 0 18px 60px rgba(0,0,0,0.36); text-align: center; }
      .research-destination-check { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 999px; background: #fff; color: #08752f; font-weight: 900; }
      .research-destination-card strong { font-size: 1rem; letter-spacing: -0.01em; }
      .research-destination-card small { color: rgba(255,255,255,0.84); }
      .research-prototype-empty { color: #aaa; border: 1px dashed rgba(255,255,255,0.25); padding: 32px; }
      .research-prototype-image { display: block; width: auto; height: auto; max-width: 100%; max-height: calc(100dvh - clamp(36px, 6.4vw, 112px)); object-fit: contain; object-position: center center; border: 1px solid rgba(255,255,255,0.16); background: #fff; box-shadow: 0 24px 80px rgba(0,0,0,0.36); cursor: pointer; user-select: none; transition: opacity 120ms ease, filter 120ms ease, transform 120ms ease; }
      .research-prototype-stage.is-destination .research-prototype-image { filter: saturate(0.85) brightness(0.8); }
      .research-prototype-stage.is-hit .research-prototype-image, .research-prototype-stage.is-miss .research-prototype-image { transform: scale(0.998); }
      .research-runner-shell.is-panel-closed .research-prototype-image { justify-self: center; align-self: center; max-width: calc(100vw - clamp(48px, 8vw, 128px)); max-height: calc(100dvh - clamp(48px, 8vw, 128px)); margin: 0 auto; }
      .research-runner-shell.is-panel-closed .research-prototype-stage.is-landscape-image .research-prototype-image { width: calc(100vw - clamp(48px, 8vw, 128px)); height: auto; }
      .research-runner-shell.is-panel-closed .research-prototype-stage.is-portrait-image .research-prototype-image { width: auto; height: calc(100dvh - clamp(48px, 8vw, 128px)); }
      .research-runner-shell.is-briefing .research-prototype-image { cursor: default; }
      .research-show-task { position: fixed; left: 24px; top: 24px; z-index: 1002; border: 1px solid rgba(255,255,255,0.28); background: rgba(17,17,17,0.78); color: #fff; backdrop-filter: blur(10px); padding: 10px 14px; font: inherit; cursor: pointer; }
      @keyframes research-feedback { from { opacity: 1; } to { opacity: 0; } }
      @media (max-width: 899px) {
        .research-runner-frame, .research-runner-shell.is-panel-closed .research-runner-frame { grid-template-columns: minmax(0, 1fr); }
        .research-prototype-stage, .research-runner-shell.is-panel-closed .research-prototype-stage { grid-column: 1; grid-row: 1; padding: 14px; }
        .research-prototype-image, .research-runner-shell.is-panel-closed .research-prototype-image { max-width: calc(100vw - 28px); max-height: calc(100dvh - 28px); }
        .research-runner-shell.is-panel-closed .research-prototype-stage.is-landscape-image .research-prototype-image { width: calc(100vw - 28px); height: auto; }
        .research-runner-shell.is-panel-closed .research-prototype-stage.is-portrait-image .research-prototype-image { width: auto; height: calc(100dvh - 28px); }
        .research-instruction-panel { position: fixed; left: 0; right: 0; bottom: 0; z-index: 1001; height: auto; max-height: min(72dvh, 620px); border-right: 0; border-top: 1px solid #e6e6e6; border-radius: 18px 18px 0 0; box-shadow: 0 -20px 70px rgba(0,0,0,0.32); }
        .research-panel-scroll { padding: 24px 22px 18px; }
        .research-panel-actions { padding: 16px 22px 22px; }
        .research-instruction-panel h1, .research-instruction-panel .lead, .research-task-meta, .research-task-step, .research-task-hint, .research-task-status, .research-task-error { max-width: 100%; }
        .research-show-task { top: auto; left: 50%; bottom: 18px; transform: translateX(-50%); border-radius: 999px; padding: 11px 16px; }
      }
    `}</style>
  )
}
