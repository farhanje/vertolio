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

  async function startTask(nextTaskIndex) {
    const nextTask = tasks[nextTaskIndex]
    if (!nextTask) {
      await completeStudy()
      return
    }

    setBusy(true)
    setError(null)

    try {
      const json = await postJson('/api/research/task/start', {
        sessionId: session.sessionId,
        taskId: nextTask.taskId,
        taskOrder: nextTaskIndex + 1,
      })

      destinationCompletionRef.current = null
      setTaskIndex(nextTaskIndex)
      setScreenIndex(0)
      setTaskRunId(json.taskRunId)
      setTaskStartedAt(Date.now())
      setAttempts(0)
      setMisclickCount(0)
      setSurveyAnswers({})
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
      // Keep the participant flow moving even if one event fails.
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
    else await startTask(nextIndex)
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
    if (!screen || busy) return

    const bounds = imageRef.current?.getBoundingClientRect()
    if (!bounds) return

    const x = clamp01((event.clientX - bounds.left) / bounds.width)
    const y = clamp01((event.clientY - bounds.top) / bounds.height)
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
        <button className="btn" type="button" disabled={busy} onClick={() => startTask(0)} style={{marginTop: 28}}>
          {busy ? 'Starting…' : 'Start study'}
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

  const imageRatio = imageMeta?.width && imageMeta?.height ? imageMeta.width / imageMeta.height : null
  const isLandscapeImage = imageRatio ? imageRatio >= 1.15 : false
  const layoutClassName = `research-task-layout ${isLandscapeImage ? 'is-landscape' : 'is-portrait'}`
  const prototypeMaxHeight = isLandscapeImage ? 'min(68vh, 720px)' : 'min(78vh, 820px)'

  return (
    <section className="section research-task-section">
      <div className="kicker"><span className="dot" /> Research</div>

      <div className={layoutClassName}>
        {screen?.imageUrl ? (
          <div className="research-prototype-stage" style={{'--prototype-max-height': prototypeMaxHeight}}>
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
              role="button"
              tabIndex={0}
              aria-label={screen.alt || screen.title || screen.screenId}
              className="research-prototype-image"
            />
          </div>
        ) : (
          <div className="research-prototype-stage is-empty">
            <p>This screen is missing its PNG image.</p>
          </div>
        )}

        <aside className="research-task-panel">
          <p className="research-task-meta">Task {taskIndex + 1} of {tasks.length} • Screen {screenIndex + 1} of {task.screens?.length || 1}</p>
          <h1>{task.title}</h1>
          {task.scenario ? <p className="lead" style={{whiteSpace: 'pre-line'}}>{task.scenario}</p> : null}
          {screen?.title ? <p className="research-screen-title">Current screen: <strong>{screen.title}</strong></p> : null}
          {busy ? <p className="research-task-status">Saving…</p> : null}
          {error ? <p className="research-task-error">{error}</p> : null}
        </aside>
      </div>

      <style>{`
        .research-task-section {
          min-height: calc(100vh - 96px);
        }

        .research-task-layout {
          display: grid;
          gap: clamp(18px, 3vw, 40px);
          margin-top: clamp(18px, 3vw, 32px);
          align-items: start;
        }

        .research-task-layout.is-portrait {
          grid-template-columns: minmax(220px, min-content) minmax(260px, 420px);
          justify-content: center;
        }

        .research-task-layout.is-landscape {
          grid-template-columns: minmax(0, 1fr);
          max-width: 1180px;
          margin-left: auto;
          margin-right: auto;
        }

        .research-prototype-stage {
          width: 100%;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(12px, 2.2vw, 32px);
          border: 1px solid #eee;
          background: #f7f7f7;
        }

        .research-task-layout.is-portrait .research-prototype-stage {
          min-height: min(82vh, 860px);
        }

        .research-task-layout.is-landscape .research-prototype-stage {
          min-height: min(72vh, 760px);
        }

        .research-prototype-stage.is-empty {
          min-height: 360px;
          color: #777;
        }

        .research-prototype-image {
          display: block;
          width: auto;
          height: auto;
          max-width: 100%;
          max-height: var(--prototype-max-height);
          border: 1px solid #e5e5e5;
          background: #fff;
          cursor: pointer;
          user-select: none;
        }

        .research-task-panel {
          border-top: 1px solid #111;
          padding-top: 18px;
        }

        .research-task-layout.is-portrait .research-task-panel {
          position: sticky;
          top: 96px;
        }

        .research-task-layout.is-landscape .research-task-panel {
          max-width: 760px;
        }

        .research-task-panel h1 {
          margin-top: 10px;
          max-width: 760px;
        }

        .research-task-panel .lead {
          margin-top: 12px;
          max-width: 760px;
        }

        .research-task-meta,
        .research-screen-title,
        .research-task-status,
        .research-task-error {
          margin-top: 0;
        }

        .research-task-meta {
          color: #777;
          font-size: 0.92rem;
        }

        .research-screen-title,
        .research-task-status,
        .research-task-error {
          margin-top: 18px;
        }

        @media (max-width: 899px) {
          .research-task-section {
            min-height: auto;
          }

          .research-task-layout,
          .research-task-layout.is-portrait,
          .research-task-layout.is-landscape {
            grid-template-columns: minmax(0, 1fr);
          }

          .research-task-layout.is-portrait .research-task-panel {
            order: 1;
            position: static;
          }

          .research-task-layout.is-portrait .research-prototype-stage {
            order: 2;
          }

          .research-task-layout.is-landscape .research-prototype-stage {
            order: 1;
          }

          .research-task-layout.is-landscape .research-task-panel {
            order: 2;
          }

          .research-prototype-stage,
          .research-task-layout.is-portrait .research-prototype-stage,
          .research-task-layout.is-landscape .research-prototype-stage {
            min-height: auto;
            padding: 16px;
          }

          .research-prototype-image {
            max-height: min(70vh, 680px);
          }
        }
      `}</style>
    </section>
  )
}
