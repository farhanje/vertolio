import './globals.css';
import SiteNav from '../components/SiteNav';

export const metadata = {
  title: 'Vertolio',
  description: 'Portfolio + Blog powered by Sanity',
};

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
        <SiteNav brand="Farhan" />
        {children}
        <Footer />
      </body>
    </html>
  );
}
