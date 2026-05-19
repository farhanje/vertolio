'use client'

import {useMemo} from 'react'

export default function HeroTicker({words = []}) {
  const text = useMemo(() => {
    const safe = (words || []).map((w) => String(w).trim()).filter(Boolean)
    const base = safe.length ? safe : [
      'Welcome to my website folks!',
      'Research-driven',
      'Systems-first',
      'Quant experiments',
      'Shipping with clarity',
    ]
    // Build a single long segment
    const seg = base.join('  ·  ')
    return `${seg}  ·  ${seg}  ·  ${seg}`
  }, [words])

  return (
    <div className="hero-ticker" aria-hidden="true">
      <div className="ticker-track">
        <div className="ticker-row">{text}</div>
        <div className="ticker-row">{text}</div>
      </div>
    </div>
  )
}
