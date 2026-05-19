import './globals.css';
import SiteNav from '../components/SiteNav';
import { GeistSans, GeistMono } from 'geist/font';

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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="app">
        <SiteNav brand="Farhan" />
        {children}
        <Footer />
      </body>
    </html>
  );
}
