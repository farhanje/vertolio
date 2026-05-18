export default function About() {
  return (
    <main className="container">
      <section className="section tight">
        <div className="hero-grid">
          <div>
            <h1>About</h1>
            <p className="lead">
              This content will be editable in Sanity (bio, roles, links). For now, it’s a placeholder.
            </p>
            <div className="btn-row">
              <a className="btn primary" href="mailto:farhanf.jamaludin@gmail.com">Email</a>
              <a className="btn" href="#" onClick={(e) => { e.preventDefault(); alert('Add your LinkedIn link in Sanity later'); }}>LinkedIn</a>
            </div>
          </div>
          <div>
            <img className="avatar" src="/avatar-placeholder.svg" alt="Portrait placeholder" />
          </div>
        </div>
      </section>
    </main>
  );
}
