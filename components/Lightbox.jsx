'use client'

import {useEffect, useRef} from 'react'

export default function Lightbox({open, src, alt = '', caption = '', onClose}) {
  const ref = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="lb" role="dialog" aria-modal="true" ref={ref}>
      <button className="lb-backdrop" onClick={onClose} aria-label="Close" />
      <div className="lb-panel">
        <div className="lb-top">
          <div className="lb-cap">{caption}</div>
          <button className="lb-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="lb-body">
          {/* Let user scroll/pan when zoomed by browser pinch/trackpad */}
          <img className="lb-img" src={src} alt={alt} />
        </div>
      </div>
    </div>
  )
}
