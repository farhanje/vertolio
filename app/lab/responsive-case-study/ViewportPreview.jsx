'use client'

import {useRef, useState} from 'react'
import styles from './ResponsiveLab.module.css'

function inspectDocument(frame) {
  try {
    const doc = frame?.contentDocument
    const win = frame?.contentWindow
    if (!doc || !win) return null

    const root = doc.documentElement
    const body = doc.body
    const clientWidth = root.clientWidth || win.innerWidth || 0
    const scrollWidth = Math.max(root.scrollWidth || 0, body?.scrollWidth || 0)
    const overflow = Math.max(0, Math.round(scrollWidth - clientWidth))

    const offenders = overflow > 0
      ? Array.from(doc.querySelectorAll('body *'))
        .map((element) => {
          const rect = element.getBoundingClientRect()
          return {
            tag: element.tagName?.toLowerCase() || 'element',
            className: typeof element.className === 'string' ? element.className : '',
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          }
        })
        .filter((item) => item.width > 0 && (item.left < -1 || item.right > clientWidth + 1))
        .sort((a, b) => Math.max(b.right - clientWidth, -b.left) - Math.max(a.right - clientWidth, -a.left))
        .slice(0, 3)
      : []

    return {clientWidth, scrollWidth, overflow, offenders}
  } catch {
    return null
  }
}

export default function ViewportPreview({viewport, src, title}) {
  const frameRef = useRef(null)
  const [report, setReport] = useState(null)

  const inspect = () => {
    const frame = frameRef.current
    if (!frame) return

    const run = () => setReport(inspectDocument(frame))
    run()
    window.setTimeout(run, 250)
    window.setTimeout(run, 900)
  }

  return (
    <section className={styles.preview}>
      <header className={styles.previewHeader}>
        <div>
          <strong>{viewport.label}</strong>
          <span>{viewport.size}</span>
        </div>
        {report ? (
          <div className={`${styles.status} ${report.overflow > 0 ? styles.statusFail : styles.statusPass}`}>
            <strong>{report.overflow > 0 ? `OVERFLOW +${report.overflow}px` : 'PASS'}</strong>
            <span>{report.clientWidth}px viewport · {report.scrollWidth}px document</span>
          </div>
        ) : (
          <div className={styles.status}><span>Checking width…</span></div>
        )}
      </header>
      {report?.offenders?.length ? (
        <div className={styles.offenders}>
          {report.offenders.map((item, index) => (
            <code key={`${item.tag}-${index}`}>
              {item.tag}{item.className ? `.${item.className.split(' ').filter(Boolean).slice(0, 2).join('.')}` : ''} · {item.width}px
            </code>
          ))}
        </div>
      ) : null}
      <div className={styles.canvas}>
        <iframe
          ref={frameRef}
          className={`${styles.frame} ${viewport.className}`}
          src={src}
          title={title}
          onLoad={inspect}
        />
      </div>
    </section>
  )
}
