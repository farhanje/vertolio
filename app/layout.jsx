import './globals.css';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { GeistSans, GeistMono } from 'geist/font';

export const metadata = {
  title: 'Vertolio',
  description: 'Portfolio + Blog powered by Sanity',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="app">
        <SiteNav brand="Farhan" />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
