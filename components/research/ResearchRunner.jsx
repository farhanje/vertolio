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

function findHit(hotspots = [], x, y) {
  return hotspots.find((hotspot) => {
    const hx = Number(hotspot.x)
    const hy = Number(hotspot.y)
    const hw = Number(hotspot.w)
    const hh = Number(hotspot.h)
    return x >= hx && x <= hx + hw && y >= hy && y <= hy + hh
  })
}

function toSurveyRows(answers, questions) {
  return questions.map((question) => {
    const value = answers[question.questionId]
    const base = {
      questionId: question.questionId,
      questionType: question.type,
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

function researchTypeLabel(type) {
  const labels = {
    ab_test: 'A/B test',
    usability_test: 'Usability testing',
    survey: 'Survey',
    prototype_test: 'Prototype test',
    concept_test: 'Concept test',
  }

  return labels[type] || 'Research study'
}

function destinationDelayMs(screen) {
  const seconds = Number(screen?.completionDelaySeconds)
  const safeSeconds = Number.isFinite(seconds) ? seconds : 1.5
  return Math.min(10000, Math.max(200, safeSeconds * 1000))
}

export default function ResearchRunner({studySlug, session}) {
  const imageRef = useRef(null)
  const destinationCompletionRef = useRef(null)
  const [configState, setConfigState] = useState({status: 'loading'})
  const [phase, setPhase] = useState('intro')
  const [taskIndex, setTaskIndex] = useState(0)
  const [screenIndex, setScreenIndex] = useState(0)
  const [taskRunId, setTaskRunId] = useState(null)
  const [taskStartedAt, setTaskStartedAt] = useState(null)
  const [attempts, setAttempts] = useState(0)
  const [misclickCount, setMisclickCount] = useState(0)
  const [surveyAnswers, setSurveyAnswers] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [imageMeta, setImageMeta] = useState(null)
  const [taskPanelOpen, setTaskPanelOpen] = useState(true)

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
  const tasks = variant?.tasks || []
  const task = tasks[taskIndex]
  const screen = task?.screens?.[screenIndex]
  const questions = task?.postTaskSurvey || []

  useEffect(() => {
    setImageMeta(null)
  }, [screen?.screenId, screen?.imageUrl])

  function prepareTask(nextTaskIndex) {
    const nextTask = tasks[nextTaskIndex]
    if (!nextTask) {
      completeStudy()
      return
    }

    destinationCompletionRef.current = null
    setTaskIndex(nextTaskIndex)
    setScreenIndex(0)
    setTaskRunId(null)
    setTaskStartedAt(null)
    setAttempts(0)
    setMisclickCount(0)
    setSurveyAnswers({})
    setTaskPanelOpen(true)
    setError(null)
    setPhase('taskBrief')
  }

  async function beginTask() {
    if (!task) return

    setBusy(true)
    setError(null)

    try {
      const json = await postJson('/api/research/task/start', {
        sessionId: session.sessionId,
        taskId: task.taskId,
        taskOrder: taskIndex + 1,
      })

      destinationCompletionRef.current = null
      setTaskRunId(json.taskRunId)
      setTaskStartedAt(Date.now())
      setAttempts(0)
      setMisclickCount(0)
      setTaskPanelOpen(false)
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

  async function finishTask({success, finalAttempts = attempts, finalMisclickCount = misclickCount}) {
    if (!taskRunId) return

    setBusy(true)
    setError(null)

    try {
      await postJson('/api/research/task/complete', {
        taskRunId,
        success,
        attempts: finalAttempts,
        misclickCount: finalMisclickCount,
        durationMs: taskStartedAt ? Date.now() - taskStartedAt : null,
      })

      if (questions.length) setPhase('survey')
      else await goNextTask()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function goNextTask() {
    const nextIndex = taskIndex + 1
    if (nextIndex >= tasks.length) await completeStudy()
    else prepareTask(nextIndex)
  }

  async function completeStudy() {
    setBusy(true)
    setError(null)

    try {
      await postJson('/api/research/complete', {sessionId: session.sessionId})
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

  async function handleScreenClick(event) {
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

    await logScreenEvent({
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

    if (hit.action === 'completeTask') {
      await finishTask({
        success: !isMisclick,
        finalAttempts: nextAttempts,
        finalMisclickCount: nextMisclickCount,
      })
      return
    }

    if (hit.action === 'goToScreen' && hit.targetScreenId) {
      const targetIndex = (task.screens || []).findIndex((item) => item.screenId === hit.targetScreenId)
      if (targetIndex >= 0) setScreenIndex(targetIndex)
      return
    }

    if (hit.action === 'back') {
      setScreenIndex((current) => Math.max(0, current - 1))
      return
    }

    setScreenIndex((current) => Math.min((task.screens?.length || 1) - 1, current + 1))
  }

  async function submitSurvey() {
    const missingRequired = questions.some((question) => {
      if (!question.required) return false
      const value = surveyAnswers[question.questionId]
      if (question.type === 'multi') return !Array.isArray(value) || value.length === 0
      return value === undefined || value === null || value === ''
    })

    if (missingRequired) {
      setError('Please answer the required questions first.')
      return
    }

    setBusy(true)
    setError(null)

    try {
      await postJson('/api/research/survey', {
        sessionId: session.sessionId,
        taskRunId,
        surveyId: `${task.taskId}_post_task`,
        answers: toSurveyRows(surveyAnswers, questions),
      })
      await goNextTask()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function setAnswer(question, value) {
    setSurveyAnswers((current) => ({...current, [question.questionId]: value}))
  }

  function toggleMulti(question, option) {
    setSurveyAnswers((current) => {
      const previous = Array.isArray(current[question.questionId]) ? current[question.questionId] : []
      const next = previous.includes(option)
        ? previous.filter((item) => item !== option)
        : [...previous, option]
      return {...current, [question.questionId]: next}
    })
  }

  function renderPrototypeStage({dimmed = false} = {}) {
    const orientation = imageMeta?.width && imageMeta?.height && imageMeta.width >= imageMeta.height
      ? 'is-landscape-image'
      : 'is-portrait-image'

    return (
      <main className={`research-prototype-stage ${orientation} ${dimmed ? 'is-dimmed' : ''}`}>
        {screen?.imageUrl ? (
          <img
            ref={imageRef}
            src={screen.imageUrl}
            alt={screen.alt || screen.title || screen.screenId}
            draggable="false"
            onLoad={(event) => {
              const img = event.currentTarget
              setImageMeta({width: img.naturalWidth, height: img.naturalHeight})
            }}
            onClick={handleScreenClick}
            role={phase === 'task' ? 'button' : undefined}
            tabIndex={phase === 'task' ? 0 : -1}
            aria-label={screen.alt || screen.title || screen.screenId}
            className="research-prototype-image"
          />
        ) : (
          <div className="research-prototype-empty">
            <p>This screen is missing its PNG image.</p>
          </div>
        )}
      </main>
    )
  }

  function renderTaskPanel() {
    const isStarted = phase === 'task'
    const primaryAction = isStarted ? null : beginTask

    return (
      <aside className="research-instruction-panel" aria-label="Task instruction">
        <div className="research-panel-scroll">
          <p className="research-task-meta">{researchTypeLabel(study.researchType)} • Variant {session.variant}</p>
          <p className="research-task-step">Task {taskIndex + 1} of {tasks.length} • Screen {screenIndex + 1} of {task.screens?.length || 1}</p>
          <h1>{task.title}</h1>
          {task.scenario ? <p className="lead" style={{whiteSpace: 'pre-line'}}>{task.scenario}</p> : null}
          {screen?.title ? <p className="research-screen-title">Current screen: <strong>{screen.title}</strong></p> : null}
          {isStarted ? <p className="research-task-hint">The task is already running. You can hide this panel and continue the prototype.</p> : <p className="research-task-hint">The timer starts after you press Start task.</p>}
          {busy ? <p className="research-task-status">Saving…</p> : null}
          {error ? <p className="research-task-error">{error}</p> : null}
        </div>

        <div className="research-panel-actions">
          {primaryAction ? (
            <button className="btn" type="button" disabled={busy} onClick={primaryAction}>
              {busy ? 'Starting…' : 'Start task'}
            </button>
          ) : null}
          {isStarted ? (
            <button className="btn secondary" type="button" onClick={() => setTaskPanelOpen(false)}>
              Hide task
            </button>
          ) : null}
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
        <p className="lead" style={{marginTop: 8}}>
          Variant <strong>{session.variant}</strong> • Session <strong>{session.sessionId}</strong>
        </p>
        <p className="lead" style={{marginTop: 10}}>{configState.error}</p>
        <p style={{marginTop: 16, maxWidth: 760}}>
          Create and publish a matching <strong>Research Study</strong> document in Sanity with slug <code>{studySlug}</code>, status <strong>Active</strong>, and at least one variant/task/screen.
        </p>
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

  if (!variant || !tasks.length) {
    return (
      <section className="section tight">
        <div className="kicker"><span className="dot" /> Research</div>
        <h1 style={{marginTop: 12}}>Study is empty</h1>
        <p className="lead" style={{marginTop: 8}}>Add at least one variant and one task in Sanity.</p>
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
        <p style={{marginTop: 18, maxWidth: 760}}>
          Research type: <strong>{researchTypeLabel(study.researchType)}</strong> • Assigned to <strong>Variant {session.variant}</strong>.
        </p>
        {error ? <p style={{marginTop: 16}}>{error}</p> : null}
        <button className="btn" type="button" disabled={busy} onClick={() => prepareTask(0)} style={{marginTop: 28}}>
          Continue to task
        </button>
      </section>
    )
  }

  if (phase === 'survey') {
    return (
      <section className="section tight">
        <div className="kicker"><span className="dot" /> Research</div>
        <h1 style={{marginTop: 12}}>Quick follow-up</h1>
        <p className="lead" style={{marginTop: 8}}>Task {taskIndex + 1} of {tasks.length}: {task.title}</p>

        <div style={{display: 'grid', gap: 28, marginTop: 32, maxWidth: 820}}>
          {questions.map((question) => (
            <div key={question.questionId}>
              <p style={{fontWeight: 650}}>{question.label}{question.required ? ' *' : ''}</p>

              {question.type === 'likert' ? (
                <div style={{marginTop: 12}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, maxWidth: 620}}>
                    <span>{question.minLabel || 'Strongly disagree'}</span>
                    <span>{question.maxLabel || 'Strongly agree'}</span>
                  </div>
                  <div style={{display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10}}>
                    {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                      <label key={value} style={{display: 'inline-flex', alignItems: 'center', gap: 6}}>
                        <input
                          type="radio"
                          name={question.questionId}
                          checked={surveyAnswers[question.questionId] === value}
                          onChange={() => setAnswer(question, value)}
                        />
                        {value}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {question.type === 'single' ? (
                <div style={{display: 'grid', gap: 8, marginTop: 12}}>
                  {(question.options || []).map((option) => (
                    <label key={option} style={{display: 'inline-flex', alignItems: 'center', gap: 8}}>
                      <input
                        type="radio"
                        name={question.questionId}
                        checked={surveyAnswers[question.questionId] === option}
                        onChange={() => setAnswer(question, option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ) : null}

              {question.type === 'multi' ? (
                <div style={{display: 'grid', gap: 8, marginTop: 12}}>
                  {(question.options || []).map((option) => (
                    <label key={option} style={{display: 'inline-flex', alignItems: 'center', gap: 8}}>
                      <input
                        type="checkbox"
                        checked={(surveyAnswers[question.questionId] || []).includes(option)}
                        onChange={() => toggleMulti(question, option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ) : null}

              {question.type === 'text' ? (
                <textarea
                  value={surveyAnswers[question.questionId] || ''}
                  onChange={(event) => setAnswer(question, event.target.value)}
                  rows={4}
                  style={{width: '100%', marginTop: 12, padding: 12, border: '1px solid #ddd'}}
                />
              ) : null}

              {question.type === 'number' ? (
                <input
                  type="number"
                  value={surveyAnswers[question.questionId] || ''}
                  onChange={(event) => setAnswer(question, event.target.value)}
                  style={{width: '100%', marginTop: 12, padding: 12, border: '1px solid #ddd'}}
                />
              ) : null}
            </div>
          ))}
        </div>

        {error ? <p style={{marginTop: 18}}>{error}</p> : null}
        <button className="btn" type="button" disabled={busy} onClick={submitSurvey} style={{marginTop: 32}}>
          {busy ? 'Saving…' : 'Continue'}
        </button>
      </section>
    )
  }

  const isTaskRunning = phase === 'task'
  const runnerClassName = `research-runner-shell ${taskPanelOpen ? 'is-panel-open' : 'is-panel-closed'} ${isTaskRunning ? 'is-running' : 'is-briefing'}`

  return (
    <section className={runnerClassName}>
      <div className="research-runner-frame">
        {taskPanelOpen ? renderTaskPanel() : null}
        {renderPrototypeStage({dimmed: !isTaskRunning})}
      </div>

      {!taskPanelOpen ? (
        <button className="research-show-task" type="button" onClick={() => setTaskPanelOpen(true)}>
          Show task
        </button>
      ) : null}

      <style>{`
        .research-runner-shell {
          position: fixed;
          inset: 0;
          z-index: 1000;
          width: 100vw;
          height: 100dvh;
          overflow: hidden;
          background: #0f0f0f;
        }

        .research-runner-frame {
          height: 100%;
          display: grid;
          grid-template-columns: minmax(300px, min(34vw, 460px)) minmax(0, 1fr);
        }

        .research-runner-shell.is-panel-closed .research-runner-frame {
          display: block;
          width: 100vw;
          height: 100dvh;
          overflow: hidden;
        }

        .research-instruction-panel {
          height: 100dvh;
          min-width: 0;
          box-sizing: border-box;
          background: #fff;
          color: #111;
          border-right: 1px solid #e6e6e6;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }

        .research-panel-scroll {
          min-width: 0;
          overflow: auto;
          overflow-x: hidden;
          padding: clamp(22px, 3vw, 44px) clamp(20px, 2.8vw, 36px);
        }

        .research-panel-actions {
          min-width: 0;
          padding: 18px clamp(20px, 2.8vw, 36px) clamp(20px, 2.8vw, 34px);
          border-top: 1px solid #eee;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          background: #fff;
          overflow-x: hidden;
        }

        .research-panel-scroll > *,
        .research-panel-actions > * {
          max-width: 100%;
          overflow-wrap: anywhere;
          box-sizing: border-box;
        }

        .research-task-meta,
        .research-task-step,
        .research-screen-title,
        .research-task-status,
        .research-task-error,
        .research-task-hint {
          margin-top: 0;
          max-width: 360px;
          overflow-wrap: anywhere;
        }

        .research-task-meta {
          color: #777;
          font-size: 0.76rem;
          letter-spacing: 0.02em;
        }

        .research-task-step {
          margin-top: 14px;
          color: #555;
          font-size: 0.88rem;
        }

        .research-instruction-panel h1 {
          margin-top: 10px;
          max-width: 360px;
          font-size: clamp(1.2rem, 1.45vw, 1.65rem);
          line-height: 1.08;
          letter-spacing: -0.02em;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .research-instruction-panel .lead {
          margin-top: 18px;
          max-width: 360px;
          font-size: clamp(0.95rem, 1.05vw, 1.05rem);
          line-height: 1.45;
        }

        .research-screen-title,
        .research-task-status,
        .research-task-error,
        .research-task-hint {
          margin-top: 18px;
          font-size: 0.88rem;
        }

        .research-task-hint {
          color: #666;
        }

        .research-task-error {
          color: #b00020;
        }

        .research-prototype-stage {
          position: relative;
          height: 100dvh;
          width: 100%;
          box-sizing: border-box;
          display: grid;
          place-items: center;
          padding: clamp(18px, 3.2vw, 56px);
          background:
            radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08), rgba(255,255,255,0) 42%),
            #101010;
          overflow: hidden;
        }

        .research-runner-shell.is-panel-closed .research-prototype-stage {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100dvh;
          max-width: none;
          margin: 0;
          padding: clamp(24px, 4vw, 64px);
          display: grid;
          place-items: center;
          transform: none;
          z-index: 1000;
        }

        .research-prototype-stage.is-dimmed .research-prototype-image {
          opacity: 0.42;
          filter: saturate(0.8);
        }

        .research-prototype-empty {
          color: #aaa;
          border: 1px dashed rgba(255,255,255,0.25);
          padding: 32px;
        }

        .research-prototype-image {
          display: block;
          width: auto;
          height: auto;
          max-width: 100%;
          max-height: calc(100dvh - clamp(36px, 6.4vw, 112px));
          object-fit: contain;
          object-position: center center;
          border: 1px solid rgba(255,255,255,0.16);
          background: #fff;
          box-shadow: 0 24px 80px rgba(0,0,0,0.36);
          cursor: pointer;
          user-select: none;
          transition: opacity 160ms ease, filter 160ms ease;
        }

        .research-runner-shell.is-panel-closed .research-prototype-image {
          justify-self: center;
          align-self: center;
          max-width: calc(100vw - clamp(48px, 8vw, 128px));
          max-height: calc(100dvh - clamp(48px, 8vw, 128px));
          margin: 0 auto;
        }

        .research-runner-shell.is-panel-closed .research-prototype-stage.is-landscape-image .research-prototype-image {
          width: calc(100vw - clamp(48px, 8vw, 128px));
          height: auto;
        }

        .research-runner-shell.is-panel-closed .research-prototype-stage.is-portrait-image .research-prototype-image {
          width: auto;
          height: calc(100dvh - clamp(48px, 8vw, 128px));
        }

        .research-runner-shell.is-briefing .research-prototype-image {
          cursor: default;
        }

        .research-show-task {
          position: fixed;
          left: 24px;
          top: 24px;
          z-index: 1002;
          border: 1px solid rgba(255,255,255,0.28);
          background: rgba(17,17,17,0.78);
          color: #fff;
          backdrop-filter: blur(10px);
          padding: 10px 14px;
          font: inherit;
          cursor: pointer;
        }

        @media (max-width: 899px) {
          .research-runner-frame,
          .research-runner-shell.is-panel-closed .research-runner-frame {
            grid-template-columns: minmax(0, 1fr);
          }

          .research-prototype-stage,
          .research-runner-shell.is-panel-closed .research-prototype-stage {
            grid-column: 1;
            grid-row: 1;
            padding: 14px;
          }

          .research-prototype-image,
          .research-runner-shell.is-panel-closed .research-prototype-image {
            max-width: calc(100vw - 28px);
            max-height: calc(100dvh - 28px);
          }

          .research-runner-shell.is-panel-closed .research-prototype-stage.is-landscape-image .research-prototype-image {
            width: calc(100vw - 28px);
            height: auto;
          }

          .research-runner-shell.is-panel-closed .research-prototype-stage.is-portrait-image .research-prototype-image {
            width: auto;
            height: calc(100dvh - 28px);
          }

          .research-instruction-panel {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1001;
            height: auto;
            max-height: min(72dvh, 620px);
            border-right: 0;
            border-top: 1px solid #e6e6e6;
            border-radius: 18px 18px 0 0;
            box-shadow: 0 -20px 70px rgba(0,0,0,0.32);
          }

          .research-panel-scroll {
            padding: 24px 22px 18px;
          }

          .research-panel-actions {
            padding: 16px 22px 22px;
          }

          .research-instruction-panel h1,
          .research-instruction-panel .lead,
          .research-task-meta,
          .research-task-step,
          .research-screen-title,
          .research-task-hint,
          .research-task-status,
          .research-task-error {
            max-width: 100%;
          }

          .research-show-task {
            top: auto;
            left: 50%;
            bottom: 18px;
            transform: translateX(-50%);
            border-radius: 999px;
            padding: 11px 16px;
          }
        }
      `}</style>
    </section>
  )
}
