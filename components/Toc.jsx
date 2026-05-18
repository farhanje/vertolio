'use client'

import {useEffect, useMemo, useState} from 'react'

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function Toc({ contentId = 'content' }) {
  const [items, setItems] = useState([])
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    const root = document.getElementById(contentId)
    if (!root) return

    const headings = Array.from(root.querySelectorAll('h2, h3'))

    // Assign stable-ish ids (and ensure uniqueness)
    const seen = new Map()
    const toc = headings.map((h) => {
      const level = h.tagName === 'H2' ? 2 : 3
      let id = h.getAttribute('id') || slugify(h.textContent)
      const count = (seen.get(id) || 0) + 1
      seen.set(id, count)
      if (count > 1) id = `${id}-${count}`
      if (!h.getAttribute('id')) h.setAttribute('id', id)
      return { id, text: h.textContent || '', level }
    })

    setItems(toc)

    // Active section highlight
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

  return (
    <div className="tocbox card">
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
  )
}
