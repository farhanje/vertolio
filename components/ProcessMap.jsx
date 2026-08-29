'use client'

import styles from './ProcessMap.module.css'

function cx(...values) {
  return values.filter(Boolean).join(' ')
}

function cellsByStage(cells = []) {
  return new Map(cells.map((cell) => [cell?.stageKey, cell]))
}

export default function ProcessMap({
  eyebrow = 'Process map',
  title,
  description,
  mode = 'journey',
  stages = [],
  lanes = [],
  note,
  theme = 'light',
}) {
  const validStages = stages.filter((stage) => stage?.key && stage?.label)
  const validLanes = lanes.filter((lane) => lane?.label)

  if (!validStages.length || !validLanes.length) return null

  return (
    <section className={cx(styles.shell, theme === 'dark' ? styles.dark : styles.light)}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>{eyebrow}</div>
        {title ? <h3 className={styles.title}>{title}</h3> : null}
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>

      <div className={styles.scroller}>
        <div
          className={styles.map}
          style={{'--stage-count': validStages.length}}
          role="table"
          aria-label={title || (mode === 'serviceBlueprint' ? 'Service blueprint' : 'User journey map')}
        >
          <div className={cx(styles.corner, styles.sticky)} role="columnheader">
            {mode === 'serviceBlueprint' ? 'Lane' : 'Journey layer'}
          </div>

          {validStages.map((stage, index) => (
            <div className={styles.stage} key={stage.key} role="columnheader">
              <span className={styles.stageNumber}>{String(index + 1).padStart(2, '0')}</span>
              <strong>{stage.label}</strong>
              {stage.caption ? <span>{stage.caption}</span> : null}
            </div>
          ))}

          {validLanes.flatMap((lane) => {
            const byStage = cellsByStage(lane.cells)
            return [
              <div className={cx(styles.laneLabel, styles.sticky)} key={`${lane._key || lane.label}-label`} role="rowheader">
                <strong>{lane.label}</strong>
                {lane.description ? <span>{lane.description}</span> : null}
              </div>,
              ...validStages.map((stage) => {
                const cell = byStage.get(stage.key)
                return (
                  <div
                    className={cx(styles.cell, cell?.emphasis && styles.emphasis)}
                    key={`${lane._key || lane.label}-${stage.key}`}
                    role="cell"
                  >
                    {cell?.text ? <span>{cell.text}</span> : <span className={styles.empty}>—</span>}
                  </div>
                )
              }),
            ]
          })}
        </div>
      </div>

      {note ? <p className={styles.note}>{note}</p> : null}
    </section>
  )
}
