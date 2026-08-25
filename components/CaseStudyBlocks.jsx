import {PortableText} from '@portabletext/react'
import styles from './CaseStudyBlocks.module.css'

const textComponents = {
  block: {
    h3: ({children}) => <h3>{children}</h3>,
  },
}

export function NarrativeSection({eyebrow, title, body, callout, theme = 'light', width = 'normal'}) {
  return (
    <section className={`${styles.narrative} ${theme === 'dark' ? styles.dark : styles.light} ${styles[`width_${width}`] || ''}`}>
      {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
      {title ? <h2>{title}</h2> : null}
      {body?.length ? <div className={styles.narrativeBody}><PortableText value={body} components={textComponents} /></div> : null}
      {callout ? <blockquote>{callout}</blockquote> : null}
    </section>
  )
}

export function ComparisonBlock({eyebrow, title, description, left, right, theme = 'light'}) {
  const items = [left, right].filter(Boolean)
  if (!items.length) return null
  return (
    <section className={`${styles.comparison} ${theme === 'dark' ? styles.dark : styles.light}`}>
      <header>
        {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
        {title ? <h3>{title}</h3> : null}
        {description ? <p>{description}</p> : null}
      </header>
      <div className={styles.comparisonGrid}>
        {items.map((item, index) => (
          <article key={item._key || index}>
            {item.label ? <div className={styles.itemLabel}>{item.label}</div> : null}
            {item.title ? <h4>{item.title}</h4> : null}
            {item.imageUrl ? <div className={styles.comparisonMedia}><img src={item.imageUrl} alt={item.alt || item.title || ''} /></div> : null}
            {item.description ? <p>{item.description}</p> : null}
            {item.note ? <small>{item.note}</small> : null}
          </article>
        ))}
      </div>
    </section>
  )
}

export function EvidenceGrid({eyebrow, title, description, metrics = [], theme = 'light', columns = 3}) {
  const valid = metrics.filter((metric) => metric?.value || metric?.label)
  if (!valid.length) return null
  return (
    <section className={`${styles.evidence} ${theme === 'dark' ? styles.dark : styles.light}`}>
      <header>
        {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
        {title ? <h3>{title}</h3> : null}
        {description ? <p>{description}</p> : null}
      </header>
      <div className={styles.metricGrid} style={{'--metric-columns': Math.max(2, Math.min(4, Number(columns) || 3))}}>
        {valid.map((metric, index) => (
          <article key={metric._key || index}>
            {metric.value ? <strong>{metric.value}</strong> : null}
            {metric.label ? <span>{metric.label}</span> : null}
            {metric.context ? <small>{metric.context}</small> : null}
          </article>
        ))}
      </div>
      {valid.some((metric) => metric.note) ? <div className={styles.notes}>{valid.map((metric, index) => metric.note ? <p key={metric._key || index}>{metric.note}</p> : null)}</div> : null}
    </section>
  )
}
