'use client'

import {useMemo, useState} from 'react'
import {usePathname} from 'next/navigation'
import TranslateToggle from './TranslateToggle'

const LINKS = [
  {href: '/', label: 'Home'},
  {href: '/work', label: 'Work'},
  {href: '/blog', label: 'Blog'},
  {href: '/resume', label: 'Resume'},
  {href: '/about', label: 'About'},
]

function isActive(path, href) {
  if (href === '/') return path === '/'
  return path === href || path.startsWith(href + '/')
}

export default function SiteNav({brand = 'Farhan', brandLogoUrl = null, brandLogoAlt = ''}) {
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)

  const active = useMemo(() => {
    const matches = {}
    for (const link of LINKS) matches[link.href] = isActive(pathname, link.href)
    return matches
  }, [pathname])

  const alt = brandLogoAlt || brand || ''

  return (
    <>
      <header className="nav nav-desktop">
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
            {LINKS.map((link) => (
              <a key={link.href} href={link.href} className={active[link.href] ? 'active' : ''}>{link.label}</a>
            ))}
            <TranslateToggle />
          </nav>
        </div>
      </header>

      <div className="nav-mobilebar" role="navigation" aria-label="Primary">
        <a href="/" className={active['/'] ? 'mnav active' : 'mnav'}>Home</a>
        <a href="/work" className={active['/work'] ? 'mnav active' : 'mnav'}>Work</a>
        <a href="/blog" className={active['/blog'] ? 'mnav active' : 'mnav'}>Blog</a>
        <button
          className="mnav mnav-btn"
          style={{display: 'block'}}
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >☰</button>
      </div>

      {open ? (
        <div className="menu-overlay" role="dialog" aria-modal="true">
          <button className="menu-backdrop" onClick={() => setOpen(false)} aria-label="Close" />
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
              <button className="menu-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>

            <div style={{marginBottom: 10}}>
              <TranslateToggle />
            </div>

            <nav className="menu-links">
              {LINKS.map((link) => (
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
