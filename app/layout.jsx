import './globals.css';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { GeistSans, GeistMono } from 'geist/font';
import {sanityFetch} from '../lib/sanity.client';
import {SITE_SETTINGS_QUERY} from '../lib/sanity.queries';
import {placeholderSiteSettings} from '../lib/placeholders';
import { SpeedInsights } from '@vercel/speed-insights/next';

export async function generateMetadata() {
  let settings = null;
  try {
    settings = await sanityFetch(SITE_SETTINGS_QUERY);
  } catch (_) {
    settings = placeholderSiteSettings;
  }

  const title = settings?.seo?.siteTitle || settings?.name || 'Portfolio';
  const description = settings?.seo?.siteDescription || settings?.heroSubtitle || 'Portfolio';
  const ogUrl = settings?.seo?.ogImage?.asset?.url || null;
  const ogAlt = settings?.seo?.ogImage?.alt || title;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogUrl ? [{ url: ogUrl, alt: ogAlt }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogUrl ? [ogUrl] : [],
    },
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="app">
        <SiteNav brand="Farhan" />
        {children}
        <SiteFooter />
        <SpeedInsights />
      </body>
    </html>
  );
}
