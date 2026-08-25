'use client'

import {useEffect} from 'react'
import {usePathname} from 'next/navigation'
import GoogleTranslateCleanup from './GoogleTranslateCleanup'

const EXCLUDED_PREFIXES = [
  '/studio',
  '/lab',
  '/research',
  '/research-admin',
  '/promo-admin',
]

function isExcluded(pathname = '/') {
  return EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export default function GoogleTranslateGate() {
  const pathname = usePathname() || '/'
  const excluded = isExcluded(pathname)

  useEffect(() => {
    if (excluded) return

    const init = () => {
      try {
        if (!window.google?.translate?.TranslateElement) return
        const host = document.getElementById('google_translate_element')
        if (!host || host.dataset.initialized === 'true') return
        host.dataset.initialized = 'true'
        new window.google.translate.TranslateElement(
          {pageLanguage: 'id', autoDisplay: false},
          'google_translate_element',
        )
      } catch (_) {}
    }

    window.googleTranslateElementInit = init

    if (window.google?.translate?.TranslateElement) {
      init()
      return
    }

    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script')
      script.id = 'google-translate-script'
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.head.appendChild(script)
    }
  }, [excluded])

  if (excluded) return null

  return (
    <>
      <div id="google_translate_element" className="g-translate-hidden" />
      <GoogleTranslateCleanup />
    </>
  )
}
