'use client'

import {useEffect, useId, useRef, useState} from 'react'
import {trackAnalytics} from '../lib/analytics.client'
import styles from './RecruiterCoverLetterPreview.module.css'

export default function RecruiterCoverLetterPreview({code, company, lang = 'en', filename}) {
  const [isOpen, setIsOpen] = useState(false)
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const titleId = useId()
  const pdfUrl = `/api/recruiter-cover-letter?code=${encodeURIComponent(code || '')}`
  const english = lang === 'en'

  const track = (eventName, target = 'cover-letter') => {
    trackAnalytics(eventName, {
      code: code || 'unknown',
      company: company || 'Unknown',
      target,
    })
  }

  useEffect(() => {
    if (!isOpen) return

    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsOpen(false)
        return
      }

      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll('button:not([disabled]), a[href]')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [isOpen])

  return (
    <>
      <button
        type="button"
        className={`btn ${styles.trigger}`}
        onClick={() => {
          track('recruiter_cover_letter_open')
          setIsOpen(true)
        }}
      >
        {english ? 'View cover letter' : 'Lihat cover letter'}
      </button>

      {isOpen ? (
        <div
          className={styles.overlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false)
          }}
        >
          <section
            className={styles.dialog}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className={styles.header}>
              <div className={styles.heading}>
                <span className={styles.eyebrow}>{english ? 'APPLICATION DOCUMENT' : 'DOKUMEN LAMARAN'}</span>
                <h2 id={titleId} className={styles.title}>{english ? 'Cover letter' : 'Cover letter'}</h2>
                {filename ? <span className={styles.filename}>{filename}</span> : null}
              </div>
              <div className={styles.actions}>
                <a
                  className={`btn ${styles.action}`}
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('recruiter_cover_letter_new_tab')}
                >
                  {english ? 'Open PDF' : 'Buka PDF'}
                </a>
                <a
                  className={`btn ${styles.action}`}
                  href={`${pdfUrl}&download=1`}
                  onClick={() => track('recruiter_cover_letter_download')}
                >
                  {english ? 'Download' : 'Unduh'}
                </a>
                <button
                  type="button"
                  className={styles.close}
                  onClick={() => setIsOpen(false)}
                  ref={closeRef}
                  aria-label={english ? 'Close cover letter preview' : 'Tutup pratinjau cover letter'}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            </div>

            <div className={styles.document}>
              <iframe title={english ? 'Cover letter PDF preview' : 'Pratinjau PDF cover letter'} src={`${pdfUrl}#view=FitH`} />
            </div>
            <p className={styles.hint}>
              {english
                ? 'Preview not showing on your device? Use Open PDF above.'
                : 'Pratinjau tidak muncul? Gunakan Buka PDF di atas.'}
            </p>
          </section>
        </div>
      ) : null}
    </>
  )
}
