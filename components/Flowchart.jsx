'use client'

import {useEffect, useId, useMemo, useRef, useState} from 'react'
import styles from './Flowchart.module.css'

const COMPACT_FLOW_WIDTH = 820

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

function longestSegmentMidpoint(points) {
  let best = null

  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index]
    const b = points[index + 1]
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)

    if (!best || (horizontal && !best.horizontal) || (horizontal === best.horizontal && length > best.length)) {
      best = {
        length,
        horizontal,
        x:(a.x + b.x) / 2,
        y:(a.y + b.y) / 2,
      }
    }
  }

  return best || {x:points[0]?.x || 0, y:points[0]?.y || 0, horizontal:true}
}

function pointsToPath(points) {
  if (!points.length) return ''
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`
    return `${path} L ${point.x} ${point.y}`
  }, '')
}

function edgeGeometry(fromRect, toRect, canvasRect) {
  const fromCenter = rectPoint(fromRect, canvasRect, 'center')
  const toCenter = rectPoint(toRect, canvasRect, 'center')
  const dx = toCenter.x - fromCenter.x
  const dy = toCenter.y - fromCenter.y
  const sameColumn = Math.abs(dx) < Math.max(fromRect.width, toRect.width) * 0.48
  const sameRow = Math.abs(dy) < Math.max(fromRect.height, toRect.height) * 0.42
  let points

  if (sameColumn && !sameRow) {
    const down = dy > 0
    const start = rectPoint(fromRect, canvasRect, down ? 'bottom' : 'top')
    const end = rectPoint(toRect, canvasRect, down ? 'top' : 'bottom')
    points = [start, end]
  } else if (dx >= 0) {
    const start = rectPoint(fromRect, canvasRect, 'right')
    const end = rectPoint(toRect, canvasRect, 'left')

    if (sameRow) {
      points = [start, end]
    } else {
      const available = Math.max(1, end.x - start.x)
      const corridorX = Math.min(
        end.x - 30,
        start.x + Math.max(34, Math.min(72, available * 0.34)),
      )
      points = [
        start,
        {x:corridorX, y:start.y},
        {x:corridorX, y:end.y},
        end,
      ]
    }
  } else {
    const start = rectPoint(fromRect, canvasRect, 'bottom')
    const end = rectPoint(toRect, canvasRect, 'bottom')
    const corridorY = Math.max(start.y, end.y) + 34
    points = [
      start,
      {x:start.x, y:corridorY},
      {x:end.x, y:corridorY},
      end,
    ]
  }

  const labelPoint = longestSegmentMidpoint(points)

  return {
    path:pointsToPath(points),
    labelX:labelPoint.x,
    labelY:labelPoint.y - (labelPoint.horizontal ? 12 : 0),
  }
}

function edgeLabelWidth(label) {
  const length = String(label || '').length
  return Math.min(184, Math.max(62, length * 6.1 + 20))
}

export default function Flowchart({
  eyebrow = 'Flowchart',
  title,
  description,
  mode = 'basic',
  direction = 'horizontal',
  lanes = [],
  nodes = [],
  edges = [],
  note,
  theme = 'light',
}) {
  const shellRef = useRef(null)
  const canvasRef = useRef(null)
  const nodeRefs = useRef(new Map())
  const [geometry, setGeometry] = useState([])
  const [compact, setCompact] = useState(false)
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
  const authoredVertical = direction === 'vertical'
  const isVertical = authoredVertical || (!isSwimlane && compact)

  useEffect(() => {
    const shell = shellRef.current
    if (!shell || typeof ResizeObserver === 'undefined') return undefined
    const measure = () => setCompact(shell.getBoundingClientRect().width < COMPACT_FLOW_WIDTH)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(shell)
    return () => observer.disconnect()
  }, [])

  const validNodes = useMemo(() => {
    return nodes
      .filter((node) => node?.key && node?.label)
      .map((node) => ({
        ...node,
        stage: clampInteger(node.column, 1, 12, 1),
        branch: isSwimlane
          ? (laneIndex.get(node.laneKey) || 1)
          : clampInteger(node.row, 1, 8, 1),
      }))
  }, [nodes, isSwimlane, laneIndex])

  const nodeKeys = useMemo(() => new Set(validNodes.map((node) => node.key)), [validNodes])

  const validEdges = useMemo(
    () => edges.filter((edge) => edge?.from && edge?.to && nodeKeys.has(edge.from) && nodeKeys.has(edge.to)),
    [edges, nodeKeys],
  )

  const stageCount = Math.max(1, ...validNodes.map((node) => node.stage))
  const branchCount = isSwimlane
    ? validLanes.length
    : Math.max(1, ...validNodes.map((node) => node.branch))

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
  }, [validNodes, validEdges, stageCount, branchCount, isSwimlane, isVertical, compact])

  if (!validNodes.length) return null

  const cellWidth = compact ? 184 : 224
  const laneWidth = compact ? 152 : 196
  const rowHeight = compact ? 164 : 188
  let minWidth
  let gridTemplateColumns
  let gridTemplateRows

  if (isVertical) {
    minWidth = Math.max(compact ? 300 : 320, branchCount * (cellWidth + 14))
    gridTemplateColumns = `repeat(${branchCount}, minmax(${cellWidth}px, 1fr))`
    gridTemplateRows = isSwimlane
      ? `${compact ? 96 : 116}px repeat(${stageCount}, minmax(${rowHeight}px, auto))`
      : `repeat(${stageCount}, minmax(${rowHeight}px, auto))`
  } else {
    minWidth = Math.max(compact ? 620 : 720, laneWidth + stageCount * (cellWidth + 14))
    gridTemplateColumns = isSwimlane
      ? `${laneWidth}px repeat(${stageCount}, minmax(${cellWidth}px, 1fr))`
      : `repeat(${stageCount}, minmax(${cellWidth}px, 1fr))`
    gridTemplateRows = `repeat(${branchCount}, minmax(${rowHeight}px, auto))`
  }

  const nodePosition = (node) => {
    if (isVertical) {
      return {
        gridColumn: node.branch,
        gridRow: node.stage + (isSwimlane ? 1 : 0),
      }
    }

    return {
      gridColumn: node.stage + (isSwimlane ? 1 : 0),
      gridRow: node.branch,
    }
  }

  return (
    <section ref={shellRef} className={cx(styles.shell, theme === 'dark' ? styles.dark : styles.light)}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>{eyebrow}</div>
        {title ? <h3 className={styles.title}>{title}</h3> : null}
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>

      <div className={styles.scroller}>
        <div
          ref={canvasRef}
          className={cx(
            styles.canvas,
            isSwimlane && styles.swimlaneCanvas,
            isVertical && styles.verticalCanvas,
            isVertical && isSwimlane && styles.verticalSwimlaneCanvas,
            compact && styles.compactCanvas,
          )}
          style={{minWidth, gridTemplateColumns, gridTemplateRows}}
          aria-label={title || 'Flowchart'}
        >
          {isSwimlane && !isVertical ? validLanes.map((lane, index) => (
            <div
              className={styles.laneBand}
              key={`${lane.key}-band`}
              style={{gridColumn:'1 / -1', gridRow:index + 1}}
              aria-hidden="true"
            />
          )) : null}

          {isSwimlane && isVertical ? validLanes.map((lane, index) => (
            <div
              className={cx(styles.laneBand, styles.verticalLaneBand)}
              key={`${lane.key}-band`}
              style={{gridColumn:index + 1, gridRow:'1 / -1'}}
              aria-hidden="true"
            />
          )) : null}

          {isSwimlane ? validLanes.map((lane, index) => (
            <div
              className={cx(styles.laneLabel, isVertical && styles.verticalLaneLabel)}
              key={lane.key}
              style={isVertical
                ? {gridColumn:index + 1, gridRow:1}
                : {gridColumn:1, gridRow:index + 1}}
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
              style={nodePosition(node)}
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
