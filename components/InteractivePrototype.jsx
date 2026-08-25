'use client'

import {useEffect, useMemo, useState} from 'react'
import styles from './InteractivePrototype.module.css'

function cx(...values) {
  return values.filter(Boolean).join(' ')
}

export default function InteractivePrototype({
  eyebrow = 'Interactive prototype',
  title,
  description,
  theme = 'dark',
  device = 'phone',
  steps = [],
}) {
  const validSteps = useMemo(() => steps.filter((step) => step?.src), [steps])
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (active > validSteps.length - 1) setActive(0)
  }, [active, validSteps.length])

  if (!validSteps.length) return null

  const current = validSteps[active]
  const isFirst = active === 0
  const isLast = active === validSteps.length - 1

  const goTo = (index) => {
    const next = Math.max(0, Math.min(index, validSteps.length - 1))
    setActive(next)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      goTo(active + 1)
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goTo(active - 1)
    }
  }

  return (
    <section
      className={cx(styles.shell, theme === 'light' ? styles.light : styles.dark)}
      aria-label={title || 'Interactive prototype'}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.copy}>
        <div className={styles.eyebrow}>{eyebrow}</div>
        {title ? <h3 className={styles.title}>{title}</h3> : null}
        {description ? <p className={styles.description}>{description}</p> : null}

        <div className={styles.stepList} aria-label="Prototype screens">
          {validSteps.map((step, index) => (
            <button
              key={step.key || `${step.label}-${index}`}
              type="button"
              className={cx(styles.stepButton, index === active && styles.stepButtonActive)}
              aria-current={index === active ? 'step' : undefined}
              onClick={() => goTo(index)}
            >
              <span className={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</span>
              <span>{step.label || `Screen ${index + 1}`}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.viewer}>
        <div className={styles.viewerTopline}>
          <span>TRY THE FLOW</span>
          <span>{String(active + 1).padStart(2, '0')} / {String(validSteps.length).padStart(2, '0')}</span>
        </div>

        <div className={styles.stage}>
          <button
            type="button"
            className={cx(styles.deviceButton, device === 'browser' ? styles.browserDevice : styles.phoneDevice)}
            onClick={() => (isLast ? goTo(0) : goTo(active + 1))}
            aria-label={isLast ? 'Restart prototype' : `Next screen: ${validSteps[active + 1]?.label || 'next'}`}
          >
            {device === 'phone' ? <span className={styles.phoneSpeaker} aria-hidden="true" /> : null}
            {device === 'browser' ? (
              <span className={styles.browserChrome} aria-hidden="true">
                <span /><span /><span />
              </span>
            ) : null}
            <img className={styles.screenImage} src={current.src} alt={current.alt || current.label || ''} />
          </button>
        </div>

        <div className={styles.viewerBottom}>
          <div className={styles.screenCopy}>
            <strong>{current.label || `Screen ${active + 1}`}</strong>
            {current.caption ? <span>{current.caption}</span> : null}
          </div>

          <div className={styles.controls}>
            <button type="button" onClick={() => goTo(active - 1)} disabled={isFirst} aria-label="Previous screen">
              ←
            </button>
            <button type="button" onClick={() => (isLast ? goTo(0) : goTo(active + 1))} aria-label={isLast ? 'Restart prototype' : 'Next screen'}>
              {isLast ? '↻' : '→'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
