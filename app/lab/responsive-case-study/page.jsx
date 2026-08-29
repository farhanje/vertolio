import styles from './ResponsiveLab.module.css'

export const metadata = {
  title: 'Responsive Case Study QA',
  robots: {index: false, follow: false},
}

const playgroundViewports = [
  {key: 'desktop', label: 'Desktop', size: '1440 × 900', className: styles.desktop},
  {key: 'tablet', label: 'Tablet', size: '768 × 1024', className: styles.tablet},
  {key: 'phone', label: 'Phone', size: '390 × 844', className: styles.phone},
]

const realCaseViewports = [
  {key: 'qris-tablet', label: 'QRIS case · Tablet', size: '768 × 1024', className: styles.tablet},
  {key: 'qris-phone', label: 'QRIS case · Phone', size: '390 × 844', className: styles.phone},
]

function Preview({viewport, src, title}) {
  return (
    <section className={styles.preview}>
      <header className={styles.previewHeader}>
        <strong>{viewport.label}</strong>
        <span>{viewport.size}</span>
      </header>
      <div className={styles.canvas}>
        <iframe
          className={`${styles.frame} ${viewport.className}`}
          src={src}
          title={title}
        />
      </div>
    </section>
  )
}

export default function ResponsiveCaseStudyLab() {
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <div className="kicker"><span className="dot" /> Portfolio system / responsive QA</div>
        <h1>Three real viewports.</h1>
        <p>
          The block playground and a real portfolio case are rendered at exact desktop, tablet, and phone widths. The goal is to catch document-level overflow as well as component-level issues before a pattern reaches another case study.
        </p>
      </header>

      <section className={styles.group}>
        <header className={styles.groupHeader}>
          <span>Reusable system</span>
          <h2>Block playground</h2>
        </header>
        <div className={styles.grid}>
          {playgroundViewports.map((viewport) => (
            <Preview
              key={viewport.key}
              viewport={viewport}
              src="/lab/case-study-blocks"
              title={`${viewport.label} case study block preview`}
            />
          ))}
        </div>
      </section>

      <section className={styles.group}>
        <header className={styles.groupHeader}>
          <span>Real-content canary</span>
          <h2>QRIS Top Up</h2>
          <p>This catches page-shell overflow, real media dimensions, long copy, navigation, and nested artifact behavior that an isolated component demo can miss.</p>
        </header>
        <div className={styles.grid}>
          {realCaseViewports.map((viewport) => (
            <Preview
              key={viewport.key}
              viewport={viewport}
              src="/work/qris-top-up-revamp"
              title={`${viewport.label} real QRIS case preview`}
            />
          ))}
        </div>
      </section>
    </main>
  )
}
