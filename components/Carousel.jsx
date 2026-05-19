'use client'

import {useMemo, useState} from 'react'
import {urlFor} from '../lib/sanity.image'

export default function Carousel({slides = [], title}) {
  const items = useMemo(() => (slides || []).filter(Boolean), [slides])
  const [i, setI] = useState(0)

  if (!items.length) return null

  const current = items[i]

  const prev = () => setI((v) => (v - 1 + items.length) % items.length)
  const next = () => setI((v) => (v + 1) % items.length)

  const src = current?.image ? urlFor(current.image).width(1600).quality(85).auto('format').url() : null

  return (
    <figure className="figure" style={{ marginTop: 18 }}>
      {title ? <div className="figure-title">{title}</div> : null}

      <div className="carousel">
        <button className="car-btn left" onClick={prev} aria-label="Previous">‹</button>

        <div className="car-frame">
          {src ? (
            <img className="car-img" src={src} alt={current?.alt || ''} />
          ) : null}
        </div>

        <button className="car-btn right" onClick={next} aria-label="Next">›</button>
      </div>

      <div className="car-meta">
        <div className="car-dots">
          {items.map((_, idx) => (
            <button
              key={idx}
              className={idx === i ? 'dot active' : 'dot'}
              onClick={() => setI(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
        <div className="car-count">{i + 1}/{items.length}</div>
      </div>

      {current?.caption ? <figcaption>{current.caption}</figcaption> : null}
    </figure>
  )
}
