export default function About() {
  return (
    <main className="container page-about">
      <section className="section tight">
        <div className="grid12">
          <div style={{ gridColumn: '1 / span 5' }}>
            <div className="kicker"><span className="dot" /> About</div>
            <h1 className="h1-tight">About</h1>
          </div>
          <div style={{ gridColumn: '6 / span 7', paddingTop: 10 }}>
            <p className="lead">
              UI/UX Designer at AstraPay. Research-driven and metrics-minded.
            </p>
            <div className="cta-row">
              <a className="btn primary" href="mailto:farhanf.jamaludin@gmail.com">Email</a>
              <a className="btn" href="/resume">Resume →</a>
            </div>
            <div className="hr" style={{ marginTop: 22 }} />
            <p className="small" style={{ marginTop: 14 }}>
              Focus: experimentation, funnel performance, and building systems that scale.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
