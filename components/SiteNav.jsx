'use client'

import {useMemo, useState} from 'react'
import {usePathname} from 'next/navigation'
import TranslateToggle from './TranslateToggle'
import {normalizeLanguage, uiCopy} from '../lib/i18n'

function isActive(path, href) {
  if (href === '/') return path === '/'
  return path === href || path.startsWith(href + '/')
}

export default function SiteNav({brand = 'Farhan', brandLogoUrl = null, brandLogoAlt = '', lang = 'en'}) {
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)
  const language = normalizeLanguage(lang)
  const copy = uiCopy(language)

  const links = useMemo(() => [
    {href: '/', label: copy.nav.home},
    {href: '/work', label: copy.nav.work},
    {href: '/blog', label: copy.nav.blog},
    {href: '/resume', label: copy.nav.resume},
    {href: '/about', label: copy.nav.about},
  ], [copy])

  const active = useMemo(() => {
    const matches = {}
    for (const link of links) matches[link.href] = isActive(pathname, link.href)
    return matches
  }, [pathname, links])

  const alt = brandLogoAlt || brand || ''
  const nativeClass = language === 'en' ? ' notranslate' : ''

  return (
    <>
      <header className={`nav nav-desktop${nativeClass}`}>
        <div className="container nav-inner">
          <div className="brand" aria-label={brand}>
            {brandLogoUrl ? (
              <img className="brand-logo" src={brandLogoUrl} alt={alt} />
            ) : (
              <span className="mark" aria-hidden="true" />
            )}
            <span className="sr-only">{brand}</span>
          </div>

          <nav className="nav-links">
            {links.map((link) => (
              <a key={link.href} href={link.href} className={active[link.href] ? 'active' : ''}>{link.label}</a>
            ))}
            <TranslateToggle initialLang={language} />
          </nav>
        </div>
      </header>

      <div className={`nav-mobilebar${nativeClass}`} role="navigation" aria-label="Primary">
        <a href="/" className={active['/'] ? 'mnav active' : 'mnav'}>{copy.nav.home}</a>
        <a href="/work" className={active['/work'] ? 'mnav active' : 'mnav'}>{copy.nav.work}</a>
        <a href="/blog" className={active['/blog'] ? 'mnav active' : 'mnav'}>{copy.nav.blog}</a>
        <button
          className="mnav mnav-btn"
          style={{display: 'block'}}
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >☰</button>
      </div>

      {open ? (
        <div className={`menu-overlay${nativeClass}`} role="dialog" aria-modal="true">
          <button className="menu-backdrop" onClick={() => setOpen(false)} aria-label={copy.close} />
          <div className="menu-drawer">
            <div className="menu-head">
              <div className="brand brand-in-drawer" aria-label={brand}>
                {brandLogoUrl ? (
                  <img className="brand-logo" src={brandLogoUrl} alt={alt} />
                ) : (
                  <span className="mark" aria-hidden="true" />
                )}
                <span className="sr-only">{brand}</span>
              </div>
              <button className="menu-close" onClick={() => setOpen(false)} aria-label={copy.close}>✕</button>
            </div>

            <div style={{marginBottom: 10}}>
              <TranslateToggle initialLang={language} />
            </div>

            <nav className="menu-links">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={active[link.href] ? 'menu-link active' : 'menu-link'}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  )
}
