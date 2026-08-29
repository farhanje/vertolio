import styles from './ResponsiveLab.module.css'

export const metadata = {
  title: 'Responsive Case Study QA',
  robots: {index: false, follow: false},
}

const viewports = [
  {key: 'desktop', label: 'Desktop', size: '1440 × 900', className: styles.desktop},
  {key: 'tablet', label: 'Tablet', size: '768 × 1024', className: styles.tablet},
  {key: 'phone', label: 'Phone', size: '390 × 844', className: styles.phone},
]

export default function ResponsiveCaseStudyLab() {
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <div className="kicker"><span className="dot" /> Portfolio system / responsive QA</div>
        <h1>Three real viewports.</h1>
        <p>
          The same case-study block playground is rendered inside exact desktop, tablet, and phone iframe widths. Use this page to inspect layout, touch targets, overflow, tab behavior, charts, prototypes, flowcharts, process maps, and evidence blocks before using a new pattern in a project.
        </p>
      </header>

      <div className={styles.grid}>
        {viewports.map((viewport) => (
          <section key={viewport.key} className={styles.preview}>
            <header className={styles.previewHeader}>
              <strong>{viewport.label}</strong>
              <span>{viewport.size}</span>
            </header>
            <div className={styles.canvas}>
              <iframe
                className={`${styles.frame} ${viewport.className}`}
                src="/lab/case-study-blocks"
                title={`${viewport.label} case study block preview`}
              />
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
