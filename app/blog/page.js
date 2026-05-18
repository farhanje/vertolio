export default function Blog() {
  return (
    <main className="container">
      <section className="section tight">
        <h1>Blog</h1>
        <p className="lead">Blog posts will be written in Sanity Studio and rendered here.</p>
      </section>
      <div className="hr" />
      <section className="section">
        <div className="grid">
          <div className="card span-12">
            <h3 style={{ marginTop: 0 }}>Coming next</h3>
            <p>We will fetch Posts from Sanity and render a clean list + detail pages.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
