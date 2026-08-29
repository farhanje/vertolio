import styles from './ResponsiveLab.module.css'
import ViewportPreview from './ViewportPreview'

export const metadata = {
  title: 'Responsive Case Study QA',
  robots: {index: false, follow: false},
}

const playgroundViewports = [
  {key: 'desktop', label: 'Desktop', size: '1440 × 900', className: styles.desktop},
  {key: 'tablet', label: 'Tablet', size: '768 × 1024', className: styles.tablet},
  {key: 'phone', label: 'Phone', size: '390 × 844', className: styles.phone},
]

const tabletPhone = [
  {key: 'tablet', label: 'Tablet', size: '768 × 1024', className: styles.tablet},
  {key: 'phone', label: 'Phone', size: '390 × 844', className: styles.phone},
]

const realCases = [
  {
    key: 'qris',
    title: 'QRIS Top Up',
    src: '/work/qris-top-up-revamp',
    description: 'Covers real media dimensions, Artifact Explorer, Interactive Prototype, Basic Flowchart, DataViz, long copy, and mobile navigation.',
  },
  {
    key: 'kyc',
    title: 'KYC Autosave',
    src: '/work/kyc-autosave-flow-a-b-test-revamp',
    description: 'Covers Journey Map, research artifacts, Interactive Prototype, Swimlane Flowchart, evidence blocks, and nested responsive behavior.',
  },
]

export default function ResponsiveCaseStudyLab() {
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <div className="kicker"><span className="dot" /> Portfolio system / responsive QA</div>
        <h1>Three real viewports.</h1>
        <p>
          The block playground and real portfolio cases are rendered at exact desktop, tablet, and phone widths. Each preview also measures document width, so an accidental tablet-sized canvas on phone is reported as overflow instead of relying on visual inspection alone.
        </p>
      </header>

      <section className={styles.group}>
        <header className={styles.groupHeader}>
          <span>Reusable system</span>
          <h2>Block playground</h2>
        </header>
        <div className={styles.grid}>
          {playgroundViewports.map((viewport) => (
            <ViewportPreview
              key={viewport.key}
              viewport={viewport}
              src="/lab/case-study-blocks"
              title={`${viewport.label} case study block preview`}
            />
          ))}
        </div>
      </section>

      {realCases.map((project) => (
        <section key={project.key} className={styles.group}>
          <header className={styles.groupHeader}>
            <span>Real-content canary</span>
            <h2>{project.title}</h2>
            <p>{project.description}</p>
          </header>
          <div className={styles.grid}>
            {tabletPhone.map((viewport) => (
              <ViewportPreview
                key={`${project.key}-${viewport.key}`}
                viewport={{...viewport, label: `${project.title} · ${viewport.label}`}}
                src={project.src}
                title={`${project.title} ${viewport.label} responsive preview`}
              />
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
