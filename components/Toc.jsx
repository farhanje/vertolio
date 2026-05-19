'use client'

import {useEffect, useState} from 'react'

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function buildToc(root) {
  const headings = Array.from(root.querySelectorAll('h2, h3'))
  const seen = new Map()
  return headings.map((h) => {
    const level = h.tagName === 'H2' ? 2 : 3
    let id = h.getAttribute('id') || slugify(h.textContent)
    const count = (seen.get(id) || 0) + 1
    seen.set(id, count)
    if (count > 1) id = `${id}-${count}`
    if (!h.getAttribute('id')) h.setAttribute('id', id)
    return { id, text: h.textContent || '', level }
  })
}

export default function Toc({ contentId = 'content' }) {
  const [items, setItems] = useState([])
  const [activeId, setActiveId] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const root = document.getElementById(contentId)
    if (!root) return

    const toc = buildToc(root)
    setItems(toc)

    const headings = Array.from(root.querySelectorAll('h2, h3'))
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0]
        if (visible?.target?.id) setActiveId(visible.target.id)
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: [0.1, 0.25, 0.5] }
    )

    headings.forEach((h) => obs.observe(h))
    return () => obs.disconnect()
  }, [contentId])

  const hasItems = items && items.length > 0
  if (!hasItems) return null

  const onClickLink = () => setOpen(false)

  return (
    <>
      {/* Desktop / large screens sidebar */}
      <div className="tocbox toc-desktop">
        <div className="toc-title">Contents</div>
        <nav className="toc">
          {items.map((it) => (
            <a
              key={it.id}
              href={`#${it.id}`}
              className={`toc-link ${activeId === it.id ? 'active' : ''} ${it.level === 3 ? 'lvl3' : ''}`}
            >
              {it.text}
            </a>
          ))}
        </nav>
      </div>

      {/* Mobile / tablet: fixed button + drawer */}
      <button className="toc-fab" onClick={() => setOpen(true)} aria-label="Open contents">
        ☰
      </button>

      {open ? (
        <div className="toc-overlay" role="dialog" aria-modal="true">
          <button className="toc-backdrop" onClick={() => setOpen(false)} aria-label="Close" />
          <div className="toc-drawer">
            <div className="toc-drawer-head">
              <div className="toc-title">Contents</div>
              <button className="toc-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
            <nav className="toc">
              {items.map((it) => (
                <a
                  key={it.id}
                  href={`#${it.id}`}
                  onClick={onClickLink}
                  className={`toc-link ${activeId === it.id ? 'active' : ''} ${it.level === 3 ? 'lvl3' : ''}`}
                >
                  {it.text}
                </a>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  )
}
