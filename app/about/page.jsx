export default function About() {
  return (
    <main className="container">
      <section className="section tight">
        <div className="kicker"><span className="dot" /> About</div>
        <h1>About</h1>
        <p className="lead">
          This page will be editable from Sanity (siteSettings) in the next iteration.
        </p>
        <div className="cta-row">
          <a className="btn primary" href="mailto:farhanf.jamaludin@gmail.com">Email</a>
          <a className="btn ghost" href="/work">Work →</a>
        </div>
      </section>
    </main>
  )
}
