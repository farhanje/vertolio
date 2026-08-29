'use client'

import {useMemo, useRef, useState} from 'react'
import {urlFor} from '../lib/sanity.image'
import Lightbox from './Lightbox'
import styles from './Carousel.module.css'

function ratioToAspect(r) {
  if (!r || r === 'auto') return null
  if (r === '16:9') return '16 / 9'
  if (r === '4:3') return '4 / 3'
  if (r === '1:1') return '1 / 1'
  return null
}

export default function Carousel({slides = [], title, ratio = '16:9'}) {
  const items = useMemo(() => (slides || []).filter(Boolean), [slides])
  const [i, setI] = useState(0)
  const [open, setOpen] = useState(false)
  const touchStart = useRef(null)
  const touchMoved = useRef(false)

  if (!items.length) return null

  const current = items[i]
  const prev = () => setI((v) => (v - 1 + items.length) % items.length)
  const next = () => setI((v) => (v + 1) % items.length)
  const builder = current?.image ? urlFor(current.image) : null
  const src = builder ? builder.width(2200).quality(85).auto('format').url() : null
  const aspect = ratioToAspect(ratio)

  const onTouchStart = (event) => {
    const touch = event.touches?.[0]
    touchStart.current = touch ? {x: touch.clientX, y: touch.clientY} : null
    touchMoved.current = false
  }

  const onTouchMove = (event) => {
    if (!touchStart.current) return
    const touch = event.touches?.[0]
    if (!touch) return
    const dx = touch.clientX - touchStart.current.x
    const dy = touch.clientY - touchStart.current.y
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) touchMoved.current = true
  }

  const onTouchEnd = (event) => {
    if (!touchStart.current) return
    const touch = event.changedTouches?.[0]
    if (!touch) return
    const dx = touch.clientX - touchStart.current.x
    const dy = touch.clientY - touchStart.current.y
    touchStart.current = null

    if (Math.abs(dx) >= 44 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      touchMoved.current = true
      if (dx < 0) next()
      else prev()
    }
  }

  const openImage = () => {
    if (touchMoved.current) {
      touchMoved.current = false
      return
    }
    setOpen(true)
  }

  return (
    <figure className="figure">
      {title ? <div className="figure-title">{title}</div> : null}

      <div
        className={styles.carousel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {items.length > 1 ? <button className={`${styles.nav} ${styles.left}`} onClick={prev} aria-label="Previous">‹</button> : null}
        <button
          type="button"
          className={styles.frame}
          style={aspect ? {aspectRatio: aspect} : undefined}
          onClick={openImage}
          aria-label="Open image"
        >
          {src ? <img className={styles.image} src={src} alt={current?.alt || ''} /> : null}
        </button>
        {items.length > 1 ? <button className={`${styles.nav} ${styles.right}`} onClick={next} aria-label="Next">›</button> : null}
      </div>

      <div className={styles.meta}>
        <div className={styles.dots}>
          {items.map((_, idx) => (
            <button
              key={idx}
              className={`${styles.dot} ${idx === i ? styles.dotActive : ''}`}
              onClick={() => setI(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
        <div className={styles.count}>{i + 1}/{items.length}</div>
      </div>

      {current?.caption ? <figcaption>{current.caption}</figcaption> : null}
      <Lightbox open={open} src={src} alt={current?.alt || ''} caption={current?.caption || title || ''} onClose={() => setOpen(false)} />
    </figure>
  )
}
