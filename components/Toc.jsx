'use client'

import {useEffect, useRef, useState} from 'react'
import {normalizeLanguage, uiCopy} from '../lib/i18n'
import {trackAnalytics} from '../lib/analytics.client'

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

export default function Toc({ contentId = 'content', lang = 'en' }) {
  const [items, setItems] = useState([])
  const [activeId, setActiveId] = useState('')
  const [open, setOpen] = useState(false)
  const deskRef = useRef(null)
  const language = normalizeLanguage(lang)
  const copy = uiCopy(language)

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

  useEffect(() => {
    if (!activeId) return
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 980px)').matches) return

    const root = deskRef.current
    if (!root) return
    const el = root.querySelector(`a[href="#${activeId}"]`)
    if (!el) return

    const box = root.getBoundingClientRect()
    const eb = el.getBoundingClientRect()
    const topLimit = box.top + 64
    const bottomLimit = box.bottom - 24

    if (eb.top < topLimit || eb.bottom > bottomLimit) {
      const elCenterInScrollArea = (eb.top - box.top) + root.scrollTop + (eb.height / 2)
      const nextTop = Math.max(0, elCenterInScrollArea - (root.clientHeight / 2))
      root.scrollTo({ top: nextTop, behavior: 'smooth' })
    }
  }, [activeId])

  const hasItems = items && items.length > 0
  if (!hasItems) return null

  const onClickLink = (item, closeDrawer = false) => {
    trackAnalytics('toc_click', {
      section: item?.id || '',
      section_title: item?.text || '',
      content_path: typeof window !== 'undefined' ? window.location.pathname : '',
    })
    if (closeDrawer) setOpen(false)
  }
  const nativeLabelClass = language === 'en' ? 'notranslate' : undefined

  return (
    <>
      <div className="tocbox toc-desktop" ref={deskRef}>
        <div className="toc-title"><span className={nativeLabelClass}>{copy.contents}</span></div>
        <nav className="toc">
          {items.map((it) => (
            <a
              key={it.id}
              href={`#${it.id}`}
              onClick={() => onClickLink(it)}
              className={`toc-link ${activeId === it.id ? 'active' : ''} ${it.level === 3 ? 'lvl3' : ''}`}
            >
              {it.text}
            </a>
          ))}
        </nav>
      </div>

      <button className="toc-fab" onClick={() => setOpen(true)} aria-label={copy.openContents}>
        ☰
      </button>

      {open ? (
        <div className="toc-overlay" role="dialog" aria-modal="true">
          <button className="toc-backdrop" onClick={() => setOpen(false)} aria-label={copy.close} />
          <div className="toc-drawer">
            <div className="toc-drawer-head">
              <div className="toc-title"><span className={nativeLabelClass}>{copy.contents}</span></div>
              <button className="toc-close" onClick={() => setOpen(false)} aria-label={copy.close}>✕</button>
            </div>
            <nav className="toc">
              {items.map((it) => (
                <a
                  key={it.id}
                  href={`#${it.id}`}
                  onClick={() => onClickLink(it, true)}
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
