'use client'

import {useEffect, useRef, useState} from 'react'

export default function MarqueeText({text}) {
  const wrapRef = useRef(null)
  const innerRef = useRef(null)
  const [overflow, setOverflow] = useState(false)

  useEffect(() => {
    const wrap = wrapRef.current
    const inner = innerRef.current
    if (!wrap || !inner) return

    const check = () => {
      const over = inner.scrollWidth > wrap.clientWidth + 2
      setOverflow(over)
    }

    check()
    const ro = new ResizeObserver(() => check())
    ro.observe(wrap)
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('resize', check)
      ro.disconnect()
    }
  }, [text])

  if (!text) return null

  return (
    <span className="mt-wrap" ref={wrapRef} title={text} aria-label={text}>
      {overflow ? (
        <span className="mt-track" ref={innerRef}>
          <span className="mt-item">{text}</span>
          <span className="mt-gap" aria-hidden="true">·</span>
          <span className="mt-item" aria-hidden="true">{text}</span>
        </span>
      ) : (
        <span className="mt-static" ref={innerRef}>{text}</span>
      )}
    </span>
  )
}
