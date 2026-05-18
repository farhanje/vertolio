export default function Home() {
  return (
    <main className="container">
      <section className="section tight">
        <div className="hero-grid">
          <div>
            <div className="kicker"><span className="dot" /> UI/UX • research-driven • metrics-minded</div>
            <h1>Vertolio</h1>
            <p className="lead">
              Next.js + Sanity CMS + Vercel. Next step: your Home, Work, About, and Blog content will be editable from Sanity Studio.
            </p>
            <div className="btn-row">
              <a className="btn primary" href="/work">Work →</a>
              <a className="btn" href="/blog">Blog →</a>
              <a className="btn" href="/studio">Studio →</a>
            </div>
          </div>
          <div>
            <img className="avatar" src="/avatar-placeholder.svg" alt="Portrait placeholder" />
          </div>
        </div>
      </section>

      <div className="hr" />

      <section className="section">
        <div className="grid">
          <div className="span-12">
            <h2 style={{ margin: 0 }}>Portfolio groups</h2>
            <p className="lead" style={{ marginTop: 10 }}>
              These groups will be driven by Sanity Organizations: AstraPay, TU/e, Telkom Indonesia, and Others.
            </p>
          </div>

          <a className="card span-6" href="/work">
            <h3 style={{ marginTop: 0 }}>AstraPay</h3>
            <p>Experiments • KYC flows • Verification UX</p>
            <div className="meta"><span className="pill">Organization</span><span className="pill">CMS</span></div>
          </a>

          <a className="card span-6" href="/work">
            <h3 style={{ marginTop: 0 }}>TU/e</h3>
            <p>Research • Coursework • Thesis projects</p>
            <div className="meta"><span className="pill">Organization</span><span className="pill">CMS</span></div>
          </a>

          <a className="card span-6" href="/work">
            <h3 style={{ marginTop: 0 }}>Telkom Indonesia</h3>
            <p>Product design work and delivery</p>
            <div className="meta"><span className="pill">Organization</span><span className="pill">CMS</span></div>
          </a>

          <a className="card span-6" href="/work">
            <h3 style={{ marginTop: 0 }}>Others</h3>
            <p>Side projects and experiments</p>
            <div className="meta"><span className="pill">Organization</span><span className="pill">CMS</span></div>
          </a>
        </div>
      </section>
    </main>
  );
}
