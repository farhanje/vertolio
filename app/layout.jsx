import './globals.css';

export const metadata = {
  title: 'Vertolio',
  description: 'Portfolio + Blog powered by Sanity',
};

function Nav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <div className="brand"><span className="mark" /> Farhan</div>
        <nav className="nav-links">
          <a className="nav-home" href="/">Home</a>
          <a className="nav-work" href="/work">Work</a>
          <a className="nav-blog" href="/blog">Blog</a>
          <a className="nav-about" href="/about">About</a>
          <a className="nav-studio" href="/studio">Studio</a>
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
