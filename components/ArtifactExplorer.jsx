'use client'

import {useEffect, useId, useRef, useState} from 'react'
import InteractivePrototype from './InteractivePrototype'
import DataVisualization from './DataVisualization'
import styles from './ArtifactExplorer.module.css'

const VERTICAL_MIN_WIDTH = 860

export default function ArtifactExplorer({
  eyebrow = 'Artifact explorer',
  title,
  description,
  tabs = [],
  theme = 'light',
  layout = 'horizontal',
}) {
  const validTabs = tabs.filter((tab) => tab?.label)
  const [active, setActive] = useState(0)
  const [compact, setCompact] = useState(false)
  const shellRef = useRef(null)
  const tabsRef = useRef(null)
  const instanceId = useId().replace(/:/g, '')
  const authoredVertical = layout === 'vertical'
  const effectiveVertical = authoredVertical && !compact

  useEffect(() => {
    if (active > validTabs.length - 1) setActive(0)
  }, [active, validTabs.length])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell || !authoredVertical || typeof ResizeObserver === 'undefined') return undefined

    const measure = () => setCompact(shell.getBoundingClientRect().width < VERTICAL_MIN_WIDTH)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(shell)
    return () => observer.disconnect()
  }, [authoredVertical])

  if (!validTabs.length) return null
  const current = validTabs[active]

  const focusTab = (index) => {
    requestAnimationFrame(() => {
      tabsRef.current?.querySelector(`[data-tab-index="${index}"]`)?.focus()
    })
  }

  const moveTab = (event, index) => {
    const previousKey = effectiveVertical ? 'ArrowUp' : 'ArrowLeft'
    const nextKey = effectiveVertical ? 'ArrowDown' : 'ArrowRight'
    let next = null

    if (event.key === previousKey) next = (index - 1 + validTabs.length) % validTabs.length
    if (event.key === nextKey) next = (index + 1) % validTabs.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = validTabs.length - 1
    if (next == null) return

    event.preventDefault()
    setActive(next)
    focusTab(next)
  }

  return (
    <section ref={shellRef} className={`${styles.shell} ${theme === 'dark' ? styles.dark : styles.light}`}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>{eyebrow}</div>
        {title ? <h3>{title}</h3> : null}
        {description ? <p>{description}</p> : null}
      </header>

      <div className={`${styles.explorerBody} ${effectiveVertical ? styles.verticalBody : styles.horizontalBody}`}>
        <div
          ref={tabsRef}
          className={`${styles.tabs} ${effectiveVertical ? styles.verticalTabs : styles.horizontalTabs}`}
          role="tablist"
          aria-label={title || 'Artifact explorer'}
          aria-orientation={effectiveVertical ? 'vertical' : 'horizontal'}
        >
          {validTabs.map((tab, index) => (
            <button
              key={tab._key || `${tab.label}-${index}`}
              id={`${instanceId}-tab-${index}`}
              data-tab-index={index}
              type="button"
              role="tab"
              tabIndex={index === active ? 0 : -1}
              aria-selected={index === active}
              aria-controls={`${instanceId}-panel-${index}`}
              className={index === active ? styles.tabActive : ''}
              onClick={() => setActive(index)}
              onKeyDown={(event) => moveTab(event, index)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{tab.label}</strong>
            </button>
          ))}
        </div>

        <div
          id={`${instanceId}-panel-${active}`}
          className={styles.panel}
          role="tabpanel"
          aria-labelledby={`${instanceId}-tab-${active}`}
        >
          {(current.title || current.description) ? (
            <div className={styles.panelIntro}>
              {current.title ? <h4>{current.title}</h4> : null}
              {current.description ? <p>{current.description}</p> : null}
            </div>
          ) : null}

          {current.kind === 'image' && current.imageUrl ? (
            <figure className={styles.imageArtifact}>
              <img src={current.imageUrl} alt={current.alt || current.title || current.label || ''} />
              {current.caption ? <figcaption>{current.caption}</figcaption> : null}
            </figure>
          ) : null}

          {current.kind === 'prototype' && current.prototype ? (
            <InteractivePrototype {...current.prototype} />
          ) : null}

          {current.kind === 'data' && current.dataViz ? (
            <DataVisualization {...current.dataViz} />
          ) : null}
        </div>
      </div>
    </section>
  )
}
