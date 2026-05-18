import './globals.css';

export const metadata = {
  title: 'Vertolio',
  description: 'Portfolio + Blog powered by Sanity',
};

function Nav({ active }) {
  const A = ({ href, k, children }) => (
    <a className={active === k ? 'active' : ''} href={href}>{children}</a>
  );

  return (
    <header className="nav">
      <div className="container nav-inner">
        <div className="brand"><span className="mark" /> Farhan</div>
        <nav className="nav-links">
          <A href="/" k="home">Home</A>
          <A href="/work" k="work">Work</A>
          <A href="/blog" k="blog">Blog</A>
          <A href="/about" k="about">About</A>
          <A href="/studio" k="studio">Studio</A>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">© {new Date().getFullYear()} Farhan</div>
    </footer>
  );
}

export default function RootLayout({ children }) {
  // active state is handled per-page for now (simple)
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
