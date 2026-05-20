'use client'

import {useEffect} from 'react'

export default function Lightbox({open, src, alt = '', caption = '', onClose}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="lb" role="dialog" aria-modal="true">
      <button className="lb-backdrop" onClick={onClose} aria-label="Close" />
      <div className="lb-panel" role="document">
        <button className="lb-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="lb-body">
          <img className="lb-img" src={src} alt={alt} />
        </div>
        {caption ? <div className="lb-cap">{caption}</div> : null}
      </div>
    </div>
  )
}
