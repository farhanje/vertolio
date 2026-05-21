import './globals.css';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { GeistSans, GeistMono } from 'geist/font';
import {sanityFetch} from '../lib/sanity.client';
import {SITE_SETTINGS_QUERY} from '../lib/sanity.queries';
import {placeholderSiteSettings} from '../lib/placeholders';
import GoogleTranslateCleanup from '../components/GoogleTranslateCleanup';

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

  const faviconUrl = settings?.favicon?.asset?.url || null;

  return {
    title,
    description,
    icons: faviconUrl ? { icon: faviconUrl, shortcut: faviconUrl, apple: faviconUrl } : undefined,
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

export default async function RootLayout({ children }) {
  let settings = null;
  try {
    settings = await sanityFetch(SITE_SETTINGS_QUERY);
  } catch (_) {
    settings = placeholderSiteSettings;
  }

  const brandLogoUrl = settings?.brandLogo?.asset?.url || null;
  const brandLogoAlt = settings?.brandLogo?.alt || settings?.name || '';
  const brand = settings?.name ? settings.name : 'Farhan Fauzan Jamaludin';

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {/* Google Translate bootstrap */}
        <script
          dangerouslySetInnerHTML={{
            __html: `function googleTranslateElementInit(){try{new google.translate.TranslateElement({pageLanguage:'id',autoDisplay:false},'google_translate_element');}catch(e){}}`,
          }}
        />
        <script src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" async />
      </head>
      <body className="app">
        {/* hidden container (we only use cookie-based translate, not the UI) */}
        <div id="google_translate_element" className="g-translate-hidden" />
        <GoogleTranslateCleanup />

        <SiteNav brand={brand} brandLogoUrl={brandLogoUrl} brandLogoAlt={brandLogoAlt} />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
