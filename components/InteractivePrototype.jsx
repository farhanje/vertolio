'use client'

import {useEffect, useMemo, useRef, useState} from 'react'
import styles from './InteractivePrototype.module.css'

function cx(...values) {
  return values.filter(Boolean).join(' ')
}

function track(name, data) {
  if (!name || typeof window === 'undefined') return
  try {
    window.umami?.track?.(name, data)
  } catch {
    // Analytics should never block the prototype.
  }
}

export default function InteractivePrototype({
  anchorId,
  eyebrow = 'Interactive prototype',
  title,
  description,
  theme = 'dark',
  device = 'phone',
  steps = [],
  analyticsPrefix = 'portfolio_prototype',
}) {
  const validSteps = useMemo(() => steps.filter((step) => step?.src), [steps])
  const stepByKey = useMemo(
    () => new Map(validSteps.map((step, index) => [step.key || String(index), {...step, __index: index}])),
    [validSteps],
  )
  const visibleSteps = useMemo(() => validSteps.filter((step) => step.showInNav !== false), [validSteps])
  const firstKey = validSteps[0]?.key || '0'
  const [activeKey, setActiveKey] = useState(firstKey)
  const [history, setHistory] = useState(firstKey ? [firstKey] : [])
  const didTrackStart = useRef(false)

  useEffect(() => {
    if (!stepByKey.has(activeKey) && firstKey) {
      setActiveKey(firstKey)
      setHistory([firstKey])
    }
  }, [activeKey, firstKey, stepByKey])

  useEffect(() => {
    if (didTrackStart.current || !firstKey) return
    didTrackStart.current = true
    const first = stepByKey.get(firstKey)
    track(first?.event || `${analyticsPrefix}_start`, {screen: first?.key || firstKey})
  }, [analyticsPrefix, firstKey, stepByKey])

  if (!validSteps.length) return null

  const current = stepByKey.get(activeKey) || {...validSteps[0], __index: 0}
  const currentKey = current.key || String(current.__index)
  const canGoBack = history.length > 1
  const hasHotspots = Array.isArray(current.hotspots) && current.hotspots.length > 0
  const isEnd = current.isEnd === true

  const enter = (key, {eventName, replaceHistory = false, interaction = 'navigate'} = {}) => {
    if (!key || !stepByKey.has(key)) return
    const target = stepByKey.get(key)
    setActiveKey(key)
    setHistory((previous) => (replaceHistory ? [key] : [...previous, key]))
    track(eventName || target?.event || `${analyticsPrefix}_${interaction}`, {screen: key, from: currentKey})
  }

  const goBack = () => {
    if (!canGoBack) return
    setHistory((previous) => {
      const nextHistory = previous.slice(0, -1)
      const previousKey = nextHistory[nextHistory.length - 1]
      if (previousKey) setActiveKey(previousKey)
      return nextHistory
    })
    track(`${analyticsPrefix}_back`, {screen: currentKey})
  }

  const restart = () => {
    if (!firstKey) return
    setActiveKey(firstKey)
    setHistory([firstKey])
    track(`${analyticsPrefix}_restart`, {screen: currentKey})
  }

  const goNext = () => {
    if (isEnd) {
      restart()
      return
    }
    if (current.nextKey) {
      enter(current.nextKey)
      return
    }
    const next = validSteps[current.__index + 1]
    if (next) enter(next.key || String(current.__index + 1))
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goBack()
    }
    if (event.key === 'ArrowRight' && !hasHotspots) {
      event.preventDefault()
      goNext()
    }
  }

  return (
    <section
      id={anchorId || undefined}
      className={cx(styles.shell, theme === 'light' ? styles.light : styles.dark)}
      aria-label={title || 'Interactive prototype'}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.copy}>
        <div className={styles.eyebrow}>{eyebrow}</div>
        {title ? <h3 className={styles.title}>{title}</h3> : null}
        {description ? <p className={styles.description}>{description}</p> : null}

        <div className={styles.stepList} aria-label="Prototype screens">
          {visibleSteps.map((step, index) => {
            const key = step.key || String(index)
            const isActive = key === activeKey || step.navGroup === current.navGroup
            return (
              <button
                key={key}
                type="button"
                className={cx(styles.stepButton, isActive && styles.stepButtonActive)}
                aria-current={isActive ? 'step' : undefined}
                onClick={() => enter(key, {replaceHistory: false})}
              >
                <span className={styles.stepNumber}>{step.navNumber || String(index + 1).padStart(2, '0')}</span>
                <span>{step.label || `Screen ${index + 1}`}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className={styles.viewer}>
        <div className={styles.viewerTopline}>
          <span>{hasHotspots ? 'CHOOSE A TASK' : isEnd ? 'FLOW COMPLETE' : 'TRY THE FLOW'}</span>
          <span>{current.counter || String(current.__index + 1).padStart(2, '0')}</span>
        </div>

        <div className={cx(styles.stage, device === 'browser' ? styles.browserStage : styles.phoneStage)}>
          <div className={cx(styles.deviceFrame, device === 'browser' ? styles.browserDevice : styles.phoneDevice)}>
            {device === 'phone' ? <span className={styles.phoneSpeaker} aria-hidden="true" /> : null}
            {device === 'browser' ? (
              <span className={styles.browserChrome} aria-hidden="true">
                <span /><span /><span />
              </span>
            ) : null}

            <img className={styles.screenImage} src={current.src} alt={current.alt || current.label || ''} />

            {hasHotspots ? current.hotspots.map((hotspot, index) => (
              <button
                key={`${currentKey}-${hotspot.label}-${index}`}
                type="button"
                className={styles.hotspot}
                style={{
                  left: `${hotspot.x}%`,
                  top: `${hotspot.y}%`,
                  width: `${hotspot.width}%`,
                  height: `${hotspot.height}%`,
                }}
                aria-label={hotspot.label}
                onClick={() => enter(hotspot.nextKey, {eventName: hotspot.event, interaction: 'choice'})}
              >
                <span>{hotspot.label}</span>
              </button>
            )) : (
              <button
                type="button"
                className={styles.screenAdvance}
                onClick={goNext}
                aria-label={isEnd ? 'Restart prototype' : `Continue from ${current.label || 'current screen'}`}
              />
            )}
          </div>
        </div>

        <div className={styles.viewerBottom}>
          <div className={styles.screenCopy}>
            {current.annotation ? <span className={styles.annotation}>{current.annotation}</span> : null}
            <strong>{current.label || 'Prototype screen'}</strong>
            {current.caption ? <span>{current.caption}</span> : null}
          </div>

          <div className={styles.controls}>
            <button type="button" onClick={goBack} disabled={!canGoBack} aria-label="Previous screen">←</button>
            <button type="button" onClick={goNext} disabled={hasHotspots} aria-label={isEnd ? 'Restart prototype' : hasHotspots ? 'Choose a task on screen' : 'Next screen'}>
              {isEnd ? '↻' : '→'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
