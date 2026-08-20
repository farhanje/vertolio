import {sanityFetch} from '../lib/sanity.client'
import {SITE_SETTINGS_QUERY} from '../lib/sanity.queries'
import {placeholderSiteSettings} from '../lib/placeholders'
import {urlFor} from '../lib/sanity.image'
import {normalizeLanguage, pickLocalized} from '../lib/i18n'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function SiteFooter({lang = 'en'}) {
  let settings = null
  try {
    settings = await sanityFetch(SITE_SETTINGS_QUERY)
  } catch (_) {
    settings = placeholderSiteSettings
  }

  const language = normalizeLanguage(lang)
  const links = (settings?.footerLinks || []).filter(Boolean)

  return (
    <footer className={language === 'en' ? 'footer notranslate' : 'footer'}>
      <div className="container footer-inner">
        <div>© {new Date().getFullYear()} Farhan</div>

        {links.length ? (
          <div className="footer-icons" aria-label="Footer links">
            {links.map((l, idx) => {
              const iconBuilder = l?.icon ? urlFor(l.icon) : null
              const iconUrl = iconBuilder ? iconBuilder.width(48).height(48).fit('max').quality(85).auto('format').url() : (l?.icon?.asset?.url || null)
              const label = pickLocalized(l?.label, l?.labelEn, language).value || 'Link'
              const iconAlt = pickLocalized(l?.icon?.alt, l?.icon?.altEn, language).value || label

              return (
                <a
                  key={`${l.url}-${idx}`}
                  className="footer-icon"
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  title={label}
                  aria-label={label}
                >
                  {iconUrl ? (
                    <img src={iconUrl} alt={iconAlt} />
                  ) : (
                    <span className="footer-fallback">↗</span>
                  )}
                </a>
              )
            })}
          </div>
        ) : null}
      </div>
    </footer>
  )
}
