'use client'

import {useEffect, useMemo, useState} from 'react'
import styles from './DataVisualization.module.css'

const W = 760
const H = 380
const PAD = {top: 26, right: 24, bottom: 54, left: 58}
const PALETTE = ['#111111', '#6f6f6f', '#a9a9a9', '#d0d0d0']

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function formatValue(value, series) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  const body = Math.abs(n) >= 1000 ? Intl.NumberFormat('en', {notation: 'compact', maximumFractionDigits: 1}).format(n) : Intl.NumberFormat('en', {maximumFractionDigits: 2}).format(n)
  return `${series?.prefix || ''}${body}${series?.suffix || ''}`
}

function inspectable(entry, onHover) {
  return {
    role: 'button',
    tabIndex: 0,
    onMouseEnter: () => onHover(entry),
    onMouseLeave: () => onHover(null),
    onFocus: () => onHover(entry),
    onBlur: () => onHover(null),
    onClick: () => onHover(entry),
  }
}

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    const next = text[i + 1]
    if (ch === '"' && quoted && next === '"') {
      cell += '"'
      i += 1
    } else if (ch === '"') {
      quoted = !quoted
    } else if (ch === ',' && !quoted) {
      row.push(cell.trim())
      cell = ''
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i += 1
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }
  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  if (rows.length < 2) return []

  const headers = rows[0]
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
}

function sanityFileUrl(ref) {
  if (!ref || !ref.startsWith('file-')) return null
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
  if (!projectId) return null
  const parts = ref.split('-')
  if (parts.length < 3) return null
  const ext = parts.pop()
  const hash = parts.slice(1).join('-')
  return `https://cdn.sanity.io/files/${projectId}/${dataset}/${hash}.${ext}`
}

function normalizeManualRows(rows = [], series = []) {
  return rows.map((row, index) => {
    const mapped = {}
    for (const value of row?.values || []) {
      if (!value?.seriesKey) continue
      const number = Number(value.value)
      mapped[value.seriesKey] = Number.isFinite(number) ? number : null
    }
    return {
      _key: row?._key || `row-${index}`,
      label: row?.label || String(index + 1),
      x: Number.isFinite(Number(row?.x)) ? Number(row.x) : null,
      ...Object.fromEntries(series.map((s) => [s.key, mapped[s.key] ?? null])),
    }
  })
}

function ChartLegend({series}) {
  if (series.length <= 1) return null
  return (
    <div className={styles.legend}>
      {series.map((item, index) => (
        <span key={item.key}><i style={{background: PALETTE[index % PALETTE.length]}} />{item.label || item.key}</span>
      ))}
    </div>
  )
}

function CartesianChart({type, rows, series, xLabel, yLabel, baseline, baselineLabel, onHover}) {
  const allValues = rows.flatMap((row) => series.map((item) => Number(row[item.key])).filter(Number.isFinite))
  if (!rows.length || !series.length || !allValues.length) return <div className={styles.empty}>Add chart data in Sanity to render this visualization.</div>

  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const isScatter = type === 'scatter'
  const xValues = isScatter ? rows.map((row) => Number(row.x)).filter(Number.isFinite) : rows.map((_, index) => index)
  const xMin = isScatter ? Math.min(...xValues) : 0
  const xMaxRaw = isScatter ? Math.max(...xValues) : Math.max(1, rows.length - 1)
  const xMax = xMaxRaw === xMin ? xMin + 1 : xMaxRaw
  const minData = Math.min(...allValues, baseline != null ? Number(baseline) : Infinity)
  const maxData = Math.max(...allValues, baseline != null ? Number(baseline) : -Infinity)
  const yMin = minData < 0 ? minData * 1.08 : 0
  const yMax = maxData === yMin ? yMin + 1 : maxData * 1.08
  const xPos = (value) => PAD.left + ((value - xMin) / (xMax - xMin || 1)) * plotW
  const yPos = (value) => PAD.top + plotH - ((value - yMin) / (yMax - yMin || 1)) * plotH
  const ticks = Array.from({length: 5}, (_, i) => yMin + ((yMax - yMin) * i) / 4)
  const groupWidth = rows.length ? plotW / rows.length : plotW
  const barGap = 5
  const barWidth = clamp((groupWidth * 0.72 - barGap * Math.max(0, series.length - 1)) / Math.max(1, series.length), 4, 42)

  return (
    <div className={styles.chartWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${type} chart`} className={styles.svg}>
        {ticks.map((tick) => {
          const y = yPos(tick)
          return (
            <g key={tick}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} className={styles.gridLine} />
              <text x={PAD.left - 10} y={y + 4} textAnchor="end" className={styles.axisText}>{Intl.NumberFormat('en', {maximumFractionDigits: 1}).format(tick)}</text>
            </g>
          )
        })}

        {baseline != null && Number.isFinite(Number(baseline)) ? (
          <g>
            <line x1={PAD.left} x2={W - PAD.right} y1={yPos(Number(baseline))} y2={yPos(Number(baseline))} className={styles.baseline} />
            {baselineLabel ? <text x={W - PAD.right} y={yPos(Number(baseline)) - 7} textAnchor="end" className={styles.baselineText}>{baselineLabel}</text> : null}
          </g>
        ) : null}

        {type === 'bar' ? rows.map((row, rowIndex) => series.map((item, seriesIndex) => {
          const value = Number(row[item.key])
          if (!Number.isFinite(value)) return null
          const groupCenter = PAD.left + groupWidth * rowIndex + groupWidth / 2
          const totalWidth = barWidth * series.length + barGap * Math.max(0, series.length - 1)
          const x = groupCenter - totalWidth / 2 + seriesIndex * (barWidth + barGap)
          const y = yPos(Math.max(value, 0))
          const baseY = yPos(Math.min(value, 0))
          const entry = {row, series: item, value}
          return <rect key={`${row._key}-${item.key}`} x={x} y={Math.min(y, baseY)} width={barWidth} height={Math.max(2, Math.abs(baseY - y))} rx="2" fill={PALETTE[seriesIndex % PALETTE.length]} className={styles.mark} aria-label={`${row.label}, ${item.label || item.key}: ${formatValue(value, item)}`} {...inspectable(entry, onHover)} />
        })) : null}

        {type === 'line' ? series.map((item, seriesIndex) => {
          const points = rows.map((row, index) => ({row, x: xPos(index), y: yPos(Number(row[item.key])), value: Number(row[item.key])})).filter((point) => Number.isFinite(point.value))
          return (
            <g key={item.key}>
              <polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={PALETTE[seriesIndex % PALETTE.length]} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
              {points.map((point) => {
                const entry = {row: point.row, series: item, value: point.value}
                return <circle key={point.row._key} cx={point.x} cy={point.y} r="5" fill={PALETTE[seriesIndex % PALETTE.length]} className={`${styles.point} ${styles.mark}`} aria-label={`${point.row.label}, ${item.label || item.key}: ${formatValue(point.value, item)}`} {...inspectable(entry, onHover)} />
              })}
            </g>
          )
        }) : null}

        {type === 'scatter' ? series.map((item, seriesIndex) => rows.map((row) => {
          const xValue = Number(row.x)
          const value = Number(row[item.key])
          if (!Number.isFinite(xValue) || !Number.isFinite(value)) return null
          const entry = {row, series: item, value, xValue}
          return <circle key={`${row._key}-${item.key}`} cx={xPos(xValue)} cy={yPos(value)} r="6" fill={PALETTE[seriesIndex % PALETTE.length]} className={`${styles.point} ${styles.mark}`} aria-label={`${row.label}, ${item.label || item.key}: ${formatValue(value, item)}`} {...inspectable(entry, onHover)} />
        })) : null}

        {!isScatter ? rows.map((row, index) => {
          if (rows.length > 14 && index % Math.ceil(rows.length / 10) !== 0 && index !== rows.length - 1) return null
          const x = type === 'bar' ? PAD.left + groupWidth * index + groupWidth / 2 : xPos(index)
          return <text key={row._key} x={x} y={H - 28} textAnchor="middle" className={styles.axisText}>{row.label}</text>
        }) : (
          <>
            <text x={PAD.left} y={H - 28} textAnchor="start" className={styles.axisText}>{Intl.NumberFormat('en', {maximumFractionDigits: 2}).format(xMin)}</text>
            <text x={W - PAD.right} y={H - 28} textAnchor="end" className={styles.axisText}>{Intl.NumberFormat('en', {maximumFractionDigits: 2}).format(xMax)}</text>
          </>
        )}

        {xLabel ? <text x={PAD.left + plotW / 2} y={H - 5} textAnchor="middle" className={styles.axisLabel}>{xLabel}</text> : null}
        {yLabel ? <text x="14" y={PAD.top + plotH / 2} textAnchor="middle" transform={`rotate(-90 14 ${PAD.top + plotH / 2})`} className={styles.axisLabel}>{yLabel}</text> : null}
      </svg>
    </div>
  )
}

function FunnelChart({rows, series, onHover}) {
  const item = series[0]
  const values = rows.map((row) => Number(row[item?.key])).filter(Number.isFinite)
  const max = Math.max(...values, 1)
  return (
    <div className={styles.funnel}>
      {rows.map((row) => {
        const value = Number(row[item?.key])
        if (!Number.isFinite(value)) return null
        const entry = {row, series: item, value}
        return (
          <div key={row._key} className={styles.funnelRow} aria-label={`${row.label}: ${formatValue(value, item)}`} {...inspectable(entry, onHover)}>
            <div className={styles.funnelMeta}><span>{row.label}</span><strong>{formatValue(value, item)}</strong></div>
            <div className={styles.funnelTrack}><div className={styles.funnelBar} style={{width: `${Math.max(3, (value / max) * 100)}%`}} /></div>
          </div>
        )
      })}
    </div>
  )
}

function CompositionChart({rows, series, onHover}) {
  return (
    <div className={styles.composition}>
      {rows.map((row) => {
        const values = series.map((item) => ({item, value: Number(row[item.key])})).filter((entry) => Number.isFinite(entry.value))
        const total = values.reduce((sum, entry) => sum + Math.max(0, entry.value), 0) || 1
        return (
          <div key={row._key} className={styles.compositionRow}>
            <div className={styles.compositionLabel}>{row.label}</div>
            <div className={styles.compositionBar}>
              {values.map((entry, index) => {
                const hoverEntry = {row, series: entry.item, value: entry.value}
                return <button key={entry.item.key} type="button" style={{width: `${(Math.max(0, entry.value) / total) * 100}%`, background: PALETTE[index % PALETTE.length]}} aria-label={`${entry.item.label}: ${formatValue(entry.value, entry.item)}`} onMouseEnter={() => onHover(hoverEntry)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(hoverEntry)} onBlur={() => onHover(null)} onClick={() => onHover(hoverEntry)} />
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function DataVisualization({
  eyebrow = 'Evidence',
  title,
  description,
  takeaway,
  chartType = 'line',
  dataSource = 'manual',
  series = [],
  rows = [],
  csvRef,
  xColumn,
  xLabel,
  yLabel,
  baseline,
  baselineLabel,
  evidenceStatus,
  source,
  period,
  sample,
  methodNote,
  theme = 'light',
}) {
  const [csvRows, setCsvRows] = useState([])
  const [csvError, setCsvError] = useState('')
  const [hover, setHover] = useState(null)

  useEffect(() => {
    if (dataSource !== 'csv' || !csvRef) return
    const url = sanityFileUrl(csvRef)
    if (!url) {
      setCsvError('CSV asset could not be resolved.')
      return
    }
    let cancelled = false
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`CSV request failed (${response.status})`)
        return response.text()
      })
      .then((text) => {
        if (cancelled) return
        setCsvRows(parseCsv(text))
        setCsvError('')
      })
      .catch((error) => {
        if (!cancelled) setCsvError(error.message)
      })
    return () => { cancelled = true }
  }, [dataSource, csvRef])

  const normalizedSeries = useMemo(() => (series || []).filter((item) => item?.key).slice(0, 4), [series])
  const normalizedRows = useMemo(() => {
    if (dataSource === 'csv') {
      return csvRows.map((row, index) => ({
        _key: `csv-${index}`,
        label: String(row[xColumn] ?? index + 1),
        x: Number.isFinite(Number(row[xColumn])) ? Number(row[xColumn]) : null,
        ...Object.fromEntries(normalizedSeries.map((item) => {
          const number = Number(String(row[item.key] ?? '').replace(/,/g, ''))
          return [item.key, Number.isFinite(number) ? number : null]
        })),
      }))
    }
    return normalizeManualRows(rows, normalizedSeries)
  }, [dataSource, csvRows, rows, normalizedSeries, xColumn])

  const metadata = [
    evidenceStatus ? evidenceStatus.toUpperCase() : null,
    source,
    period,
    sample,
  ].filter(Boolean)

  return (
    <section className={`${styles.shell} ${theme === 'dark' ? styles.dark : styles.light}`}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>{eyebrow}</div>
          {title ? <h3>{title}</h3> : null}
          {description ? <p>{description}</p> : null}
        </div>
        {metadata.length ? <div className={styles.meta}>{metadata.join(' · ')}</div> : null}
      </header>

      <ChartLegend series={normalizedSeries} />

      <div className={styles.visual}>
        {csvError ? <div className={styles.error}>{csvError}</div> : null}
        {chartType === 'funnel' ? <FunnelChart rows={normalizedRows} series={normalizedSeries} onHover={setHover} /> : null}
        {chartType === 'composition' ? <CompositionChart rows={normalizedRows} series={normalizedSeries} onHover={setHover} /> : null}
        {['line', 'bar', 'scatter'].includes(chartType) ? <CartesianChart type={chartType} rows={normalizedRows} series={normalizedSeries} xLabel={xLabel} yLabel={yLabel} baseline={baseline} baselineLabel={baselineLabel} onHover={setHover} /> : null}

        {hover ? (
          <div className={styles.tooltip}>
            <button type="button" className={styles.tooltipClose} onClick={() => setHover(null)} aria-label="Close data tooltip">×</button>
            <span>{hover.row?.label}</span>
            <strong>{hover.series?.label || hover.series?.key}: {formatValue(hover.value, hover.series)}</strong>
            {hover.xValue != null ? <small>{xLabel || 'X'}: {hover.xValue}</small> : null}
          </div>
        ) : null}
      </div>

      {takeaway ? (
        <div className={styles.takeaway}>
          <span>TAKEAWAY</span>
          <p>{takeaway}</p>
        </div>
      ) : null}

      {normalizedRows.length ? (
        <details className={styles.tableDetails}>
          <summary>View data</summary>
          <div className={styles.tableScroll}>
            <table>
              <thead><tr><th>{xLabel || 'Label'}</th>{normalizedSeries.map((item) => <th key={item.key}>{item.label || item.key}</th>)}</tr></thead>
              <tbody>{normalizedRows.map((row) => <tr key={row._key}><td>{row.label}</td>{normalizedSeries.map((item) => <td key={item.key}>{formatValue(row[item.key], item)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </details>
      ) : null}

      {methodNote ? <p className={styles.method}>{methodNote}</p> : null}
    </section>
  )
}
