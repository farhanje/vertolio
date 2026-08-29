'use client'

import {useEffect} from 'react'
import styles from './Lightbox.module.css'

export default function Lightbox({open, src, alt = '', caption = '', onClose}) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={caption || alt || 'Image preview'}>
      <button className={styles.backdrop} onClick={onClose} aria-label="Close" />
      <div className={styles.panel} role="document">
        <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
        <div className={styles.body}>
          <img className={styles.image} src={src} alt={alt} />
        </div>
        {caption ? <p className={styles.caption}>{caption}</p> : null}
      </div>
    </div>
  )
}
