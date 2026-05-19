'use client'

import {useState} from 'react'
import Lightbox from './Lightbox'

export default function ZoomableImage({src, alt = '', caption = ''}) {
  const [open, setOpen] = useState(false)

  if (!src) return null

  return (
    <>
      <button className="zoom" type="button" onClick={() => setOpen(true)} aria-label="Open image">
        <img src={src} alt={alt} />
        <span className="zoom-hint">Click to zoom</span>
      </button>
      <Lightbox open={open} src={src} alt={alt} caption={caption} onClose={() => setOpen(false)} />
    </>
  )
}
