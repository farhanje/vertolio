'use client'

import {useEffect, useId, useMemo, useRef, useState} from 'react'
import styles from './Flowchart.module.css'

function cx(...values) {
  return values.filter(Boolean).join(' ')
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function nodeKindClass(kind) {
  if (kind === 'start') return styles.nodeStart
  if (kind === 'end') return styles.nodeEnd
  if (kind === 'decision') return styles.nodeDecision
  if (kind === 'system') return styles.nodeSystem
  return styles.nodeProcess
}

function rectPoint(rect, canvasRect, side) {
  const left = rect.left - canvasRect.left
  const top = rect.top - canvasRect.top
  const right = rect.right - canvasRect.left
  const bottom = rect.bottom - canvasRect.top
  const cx = left + rect.width / 2
  const cy = top + rect.height / 2

  if (side === 'left') return {x:left, y:cy}
  if (side === 'right') return {x:right, y:cy}
  if (side === 'top') return {x:cx, y:top}
  if (side === 'bottom') return {x:cx, y:bottom}
  return {x:cx, y:cy}
}

function edgeGeometry(fromRect, toRect, canvasRect) {
  const fromCenter = rectPoint(fromRect, canvasRect, 'center')
  const toCenter = rectPoint(toRect, canvasRect, 'center')
  const dx = toCenter.x - fromCenter.x
  const dy = toCenter.y - fromCenter.y

  let start
  let end
  let path

  if (dx > 40) {
    start = rectPoint(fromRect, canvasRect, 'right')
    end = rectPoint(toRect, canvasRect, 'left')
    const bend = Math.max(34, (end.x - start.x) * 0.42)
    path = `M ${start.x} ${start.y} C ${start.x + bend} ${start.y}, ${end.x - bend} ${end.y}, ${end.x} ${end.y}`
  } else if (Math.abs(dy) > 36) {
    const down = dy > 0
    start = rectPoint(fromRect, canvasRect, down ? 'bottom' : 'top')
    end = rectPoint(toRect, canvasRect, down ? 'top' : 'bottom')
    const bend = Math.max(30, Math.abs(end.y - start.y) * 0.42)
    const direction = down ? 1 : -1
    path = `M ${start.x} ${start.y} C ${start.x} ${start.y + direction * bend}, ${end.x} ${end.y - direction * bend}, ${end.x} ${end.y}`
  } else {
    start = rectPoint(fromRect, canvasRect, 'left')
    end = rectPoint(toRect, canvasRect, 'right')
    const loopX = Math.max(start.x, end.x) + 54
    path = `M ${start.x} ${start.y} C ${loopX} ${start.y}, ${loopX} ${end.y}, ${end.x} ${end.y}`
  }

  return {
    path,
    labelX: (start.x + end.x) / 2,
    labelY: (start.y + end.y) / 2,
  }
}

function edgeLabelWidth(label) {
  const length = String(label || '').length
  return Math.min(190, Math.max(64, length * 6.4 + 20))
}

export default function Flowchart({
  eyebrow = 'Flowchart',
  title,
  description,
  mode = 'basic',
  lanes = [],
  nodes = [],
  edges = [],
  note,
  theme = 'light',
}) {
  const canvasRef = useRef(null)
  const nodeRefs = useRef(new Map())
  const [geometry, setGeometry] = useState([])
  const markerId = `flow-arrow-${useId().replace(/:/g, '')}`

  const validLanes = useMemo(
    () => lanes.filter((lane) => lane?.key && lane?.label),
    [lanes],
  )

  const laneIndex = useMemo(
    () => new Map(validLanes.map((lane, index) => [lane.key, index + 1])),
    [validLanes],
  )

  const isSwimlane = mode === 'swimlane' && validLanes.length > 0

  const validNodes = useMemo(() => {
    return nodes
      .filter((node) => node?.key && node?.label)
      .map((node) => ({
        ...node,
        column: clampInteger(node.column, 1, 12, 1),
        row: isSwimlane
          ? (laneIndex.get(node.laneKey) || 1)
          : clampInteger(node.row, 1, 8, 1),
      }))
  }, [nodes, isSwimlane, laneIndex])

  const nodeKeys = useMemo(() => new Set(validNodes.map((node) => node.key)), [validNodes])

  const validEdges = useMemo(
    () => edges.filter((edge) => edge?.from && edge?.to && nodeKeys.has(edge.from) && nodeKeys.has(edge.to)),
    [edges, nodeKeys],
  )

  const columnCount = Math.max(1, ...validNodes.map((node) => node.column))
  const rowCount = isSwimlane
    ? validLanes.length
    : Math.max(1, ...validNodes.map((node) => node.row))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !validNodes.length) return undefined

    let frame = null

    const measure = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const canvasRect = canvas.getBoundingClientRect()
        const next = validEdges.map((edge, index) => {
          const fromEl = nodeRefs.current.get(edge.from)
          const toEl = nodeRefs.current.get(edge.to)
          if (!fromEl || !toEl) return null
          const points = edgeGeometry(fromEl.getBoundingClientRect(), toEl.getBoundingClientRect(), canvasRect)
          return {...edge, ...points, key:edge._key || `${edge.from}-${edge.to}-${index}`}
        }).filter(Boolean)
        setGeometry(next)
      })
    }

    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    observer?.observe(canvas)
    for (const node of validNodes) {
      const element = nodeRefs.current.get(node.key)
      if (element) observer?.observe(element)
    }
    window.addEventListener('resize', measure)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [validNodes, validEdges, columnCount, rowCount, isSwimlane])

  if (!validNodes.length) return null

  const laneOffset = isSwimlane ? 1 : 0
  const minWidth = Math.max(680, (isSwimlane ? 174 : 0) + columnCount * 205)
  const gridTemplateColumns = isSwimlane
    ? `174px repeat(${columnCount}, minmax(188px, 1fr))`
    : `repeat(${columnCount}, minmax(188px, 1fr))`
  const gridTemplateRows = `repeat(${rowCount}, minmax(142px, auto))`

  return (
    <section className={cx(styles.shell, theme === 'dark' ? styles.dark : styles.light)}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>{eyebrow}</div>
        {title ? <h3 className={styles.title}>{title}</h3> : null}
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>

      <div className={styles.scroller}>
        <div
          ref={canvasRef}
          className={cx(styles.canvas, isSwimlane && styles.swimlaneCanvas)}
          style={{minWidth, gridTemplateColumns, gridTemplateRows}}
          aria-label={title || 'Flowchart'}
        >
          {isSwimlane ? validLanes.map((lane, index) => (
            <div
              className={styles.laneBand}
              key={`${lane.key}-band`}
              style={{gridColumn:'1 / -1', gridRow:index + 1}}
              aria-hidden="true"
            />
          )) : null}

          {isSwimlane ? validLanes.map((lane, index) => (
            <div
              className={styles.laneLabel}
              key={lane.key}
              style={{gridColumn:1, gridRow:index + 1}}
            >
              <strong>{lane.label}</strong>
              {lane.description ? <span>{lane.description}</span> : null}
            </div>
          )) : null}

          <svg className={styles.edges} aria-hidden="true">
            <defs>
              <marker id={markerId} viewBox="0 0 10 10" refX="8.2" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className={styles.arrowHead} />
              </marker>
            </defs>
            {geometry.map((edge) => (
              <g key={edge.key}>
                <path
                  d={edge.path}
                  className={cx(
                    styles.edgePath,
                    edge.style === 'dashed' && styles.edgeDashed,
                    edge.emphasis && styles.edgeEmphasis,
                  )}
                  markerEnd={`url(#${markerId})`}
                />
                {edge.label ? (
                  <g transform={`translate(${edge.labelX} ${edge.labelY})`}>
                    <rect
                      className={styles.edgeLabelBg}
                      x={-edgeLabelWidth(edge.label) / 2}
                      y="-12"
                      width={edgeLabelWidth(edge.label)}
                      height="24"
                      rx="12"
                    />
                    <text className={styles.edgeLabel} x="0" y="4" textAnchor="middle">{edge.label}</text>
                  </g>
                ) : null}
              </g>
            ))}
          </svg>

          {validNodes.map((node) => (
            <div
              className={styles.nodeSlot}
              key={node.key}
              style={{gridColumn:node.column + laneOffset, gridRow:node.row}}
            >
              <article
                ref={(element) => {
                  if (element) nodeRefs.current.set(node.key, element)
                  else nodeRefs.current.delete(node.key)
                }}
                className={cx(
                  styles.node,
                  nodeKindClass(node.kind),
                  node.emphasis && styles.nodeEmphasis,
                )}
              >
                <div className={styles.nodeTopline}>
                  <span>{node.badge || node.kind || 'process'}</span>
                </div>
                <strong>{node.label}</strong>
                {node.description ? <p>{node.description}</p> : null}
              </article>
            </div>
          ))}

          <div className={styles.srOnly}>
            <p>Flow connections</p>
            <ul>
              {validEdges.map((edge, index) => (
                <li key={edge._key || `${edge.from}-${edge.to}-${index}`}>
                  {edge.from} to {edge.to}{edge.label ? `, ${edge.label}` : ''}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {note ? <p className={styles.note}>{note}</p> : null}
    </section>
  )
}
