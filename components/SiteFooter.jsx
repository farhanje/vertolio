import {sanityFetch} from '../lib/sanity.client'
import {SITE_SETTINGS_QUERY} from '../lib/sanity.queries'
import {placeholderSiteSettings} from '../lib/placeholders'
import {urlFor} from '../lib/sanity.image'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function SiteFooter() {
  let settings = null
  try {
    settings = await sanityFetch(SITE_SETTINGS_QUERY)
  } catch (_) {
    settings = placeholderSiteSettings
  }

  const links = (settings?.footerLinks || []).filter(Boolean)

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>© {new Date().getFullYear()} Farhan</div>

        {links.length ? (
          <div className="footer-icons" aria-label="Footer links">
            {links.map((l, idx) => {
              const iconBuilder = l?.icon ? urlFor(l.icon) : null
              const iconUrl = iconBuilder ? iconBuilder.width(48).height(48).fit('max').quality(85).auto('format').url() : (l?.icon?.asset?.url || null)

              return (
                <a
                  key={`${l.url}-${idx}`}
                  className="footer-icon"
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  title={l.label || ''}
                  aria-label={l.label || 'Link'}
                >
                  {iconUrl ? (
                    <img src={iconUrl} alt={l?.icon?.alt || l.label || ''} />
                  ) : (
                    <span className="footer-fallback">↗</span>
                  )}
                </a>
              )}
            )}
          </div>
        ) : null}
      </div>
    </footer>
  )
}
