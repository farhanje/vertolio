export default function Work() {
  return (
    <main className="container">
      <section className="section tight">
        <h1>Work</h1>
        <p className="lead">This page will be CMS-driven and grouped by Organization (AstraPay / TU/e / Telkom / Others).</p>
      </section>
      <div className="hr" />
      <section className="section">
        <div className="grid">
          <div className="card span-12">
            <h3 style={{ marginTop: 0 }}>Coming next</h3>
            <p>We will fetch Organizations + Projects from Sanity and render grouped sections automatically.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
