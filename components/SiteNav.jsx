'use client'

import {useMemo, useState} from 'react'
import {usePathname} from 'next/navigation'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/work', label: 'Work' },
  { href: '/blog', label: 'Blog' },
  { href: '/resume', label: 'Resume' },
  { href: '/about', label: 'About' },
]

function isActive(path, href) {
  if (href === '/') return path === '/'
  return path === href || path.startsWith(href + '/')
}

export default function SiteNav({ brand = 'Farhan' }) {
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)

  const active = useMemo(() => {
    const m = {}
    for (const l of LINKS) m[l.href] = isActive(pathname, l.href)
    return m
  }, [pathname])

  return (
    <>
      {/* Desktop / large screens (top nav) */}
      <header className="nav nav-desktop">
        <div className="container nav-inner">
          <div className="brand"><span className="mark" /> {brand}</div>
          <nav className="nav-links">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className={active[l.href] ? 'active' : ''}>{l.label}</a>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile / tablet (thumb-level bottom bar) */}
      <div className="nav-mobilebar" role="navigation" aria-label="Primary">
        <a href="/" className={active['/'] ? 'mnav active' : 'mnav'}>Home</a>
        <a href="/work" className={active['/work'] ? 'mnav active' : 'mnav'}>Work</a>
        <a href="/blog" className={active['/blog'] ? 'mnav active' : 'mnav'}>Blog</a>
        <a href="/resume" className={active['/resume'] ? 'mnav active' : 'mnav'}>Resume</a>
        <a href="/about" className={active['/about'] ? 'mnav active mnav-about' : 'mnav mnav-about'}>About</a>
        <button className="mnav mnav-btn" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
      </div>

      {open ? (
        <div className="menu-overlay" role="dialog" aria-modal="true">
          <button className="menu-backdrop" onClick={() => setOpen(false)} aria-label="Close" />
          <div className="menu-drawer">
            <div className="menu-head">
              <div className="toc-title">Menu</div>
              <button className="menu-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
            <nav className="menu-links">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={active[l.href] ? 'menu-link active' : 'menu-link'}
                >
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  )
}
