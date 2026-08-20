'use client'

import {useEffect, useMemo, useRef, useState} from 'react'

export default function HeroTicker({words = [], nativeEnglish = false}) {
  const ref = useRef(null)
  const [rows, setRows] = useState(6)

  const text = useMemo(() => {
    const safe = (words || []).map((w) => String(w).trim()).filter(Boolean)
    const base = safe.length
      ? safe
      : ['Welcome to my website folks!', 'Research-driven', 'Systems-first', 'Quant experiments', 'Shipping with clarity']

    const seg = base.join('  ·  ')
    return `${seg}  ·  ${seg}  ·  ${seg}`
  }, [words])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const calc = () => {
      const h = el.getBoundingClientRect().height || window.innerHeight || 600
      const rowH = window.innerWidth <= 820 ? 58 : 52
      const n = Math.max(6, Math.ceil(h / rowH) + 2)
      setRows(n)
    }

    calc()

    const ro = new ResizeObserver(() => calc())
    ro.observe(el)

    window.addEventListener('resize', calc)
    return () => {
      window.removeEventListener('resize', calc)
      ro.disconnect()
    }
  }, [])

  return (
    <div ref={ref} className={nativeEnglish ? 'hero-ticker notranslate' : 'hero-ticker'} aria-hidden="true">
      <div className="ticker-track">
        {Array.from({length: rows}).map((_, idx) => {
          const rev = idx % 2 === 1
          const dur = 18 + (idx % 5) * 3
          return (
            <div
              key={idx}
              className={rev ? 'ticker-row rev' : 'ticker-row'}
              style={{'--d': `${dur}s`}}
            >
              {text}
            </div>
          )
        })}
      </div>
    </div>
  )
}
