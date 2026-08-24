import './globals.css';
import './overrides.css';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import AnalyticsBridge from '../components/AnalyticsBridge';
import UmamiRecorder from '../components/UmamiRecorder';
import { GeistSans, GeistMono } from 'geist/font';
import {sanityFetch} from '../lib/sanity.client';
import {SITE_SETTINGS_QUERY} from '../lib/sanity.queries';
import {placeholderSiteSettings} from '../lib/placeholders';
import GoogleTranslateCleanup from '../components/GoogleTranslateCleanup';
import { Analytics } from '@vercel/analytics/next';
import {getLanguage} from '../lib/i18n.server';
import {pickLocalized} from '../lib/i18n';

export async function generateMetadata() {
  const lang = getLanguage();
  let settings = null;
  try {
    settings = await sanityFetch(SITE_SETTINGS_QUERY);
  } catch (_) {
    settings = placeholderSiteSettings;
  }

  const titlePick = pickLocalized(settings?.seo?.siteTitle, settings?.seo?.siteTitleEn, lang);
  const descriptionPick = pickLocalized(settings?.seo?.siteDescription, settings?.seo?.siteDescriptionEn, lang);
  const ogAltPick = pickLocalized(settings?.seo?.ogImage?.alt, settings?.seo?.ogImage?.altEn, lang);

  const title = titlePick.value || settings?.name || 'Portfolio';
  const description = descriptionPick.value || settings?.heroSubtitle || 'Portfolio';
  const ogUrl = settings?.seo?.ogImage?.asset?.url || null;
  const ogAlt = ogAltPick.value || title;

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
  const lang = getLanguage();
  let settings = null;
  try {
    settings = await sanityFetch(SITE_SETTINGS_QUERY);
  } catch (_) {
    settings = placeholderSiteSettings;
  }

  const brandLogoUrl = settings?.brandLogo?.asset?.url || null;
  const brandAltPick = pickLocalized(settings?.brandLogo?.alt, settings?.brandLogo?.altEn, lang);
  const brandLogoAlt = brandAltPick.value || settings?.name || '';
  const brand = settings?.name ? settings.name : 'Farhan Fauzan Jamaludin';

  const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || '';
  const umamiScriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL || '';

  return (
    <html lang={lang} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {/* Google Translate stays available as the fallback while native English fields are being filled in Sanity. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `function googleTranslateElementInit(){try{new google.translate.TranslateElement({pageLanguage:'id',autoDisplay:false},'google_translate_element');}catch(e){}}`,
          }}
        />
        <script src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" async />

        {umamiWebsiteId && umamiScriptUrl ? (
          <script
            defer
            src={umamiScriptUrl}
            data-website-id={umamiWebsiteId}
            data-exclude-search="false"
            data-performance="true"
          />
        ) : null}
      </head>
      <body className="app" data-language={lang}>
        <div id="google_translate_element" className="g-translate-hidden" />
        <GoogleTranslateCleanup />
        <AnalyticsBridge />
        <UmamiRecorder trackerUrl={umamiScriptUrl} websiteId={umamiWebsiteId} />

        <SiteNav brand={brand} brandLogoUrl={brandLogoUrl} brandLogoAlt={brandLogoAlt} lang={lang} />
        {children}
        <SiteFooter lang={lang} />

        {/* Keep Vercel Analytics during the Umami rollout as an independent baseline. */}
        <Analytics />
      </body>
    </html>
  );
}
