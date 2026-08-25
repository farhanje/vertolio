'use client'

import {useEffect, useState} from 'react'
import InteractivePrototype from './InteractivePrototype'
import DataVisualization from './DataVisualization'
import styles from './ArtifactExplorer.module.css'

export default function ArtifactExplorer({eyebrow = 'Artifact explorer', title, description, tabs = [], theme = 'light'}) {
  const validTabs = tabs.filter((tab) => tab?.label)
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (active > validTabs.length - 1) setActive(0)
  }, [active, validTabs.length])

  if (!validTabs.length) return null
  const current = validTabs[active]

  return (
    <section className={`${styles.shell} ${theme === 'dark' ? styles.dark : styles.light}`}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>{eyebrow}</div>
        {title ? <h3>{title}</h3> : null}
        {description ? <p>{description}</p> : null}
      </header>

      <div className={styles.tabs} role="tablist" aria-label={title || 'Artifact explorer'}>
        {validTabs.map((tab, index) => (
          <button
            key={tab._key || `${tab.label}-${index}`}
            type="button"
            role="tab"
            aria-selected={index === active}
            className={index === active ? styles.tabActive : ''}
            onClick={() => setActive(index)}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.panel} role="tabpanel">
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
    </section>
  )
}
