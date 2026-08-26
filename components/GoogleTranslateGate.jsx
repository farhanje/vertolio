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

const RESET_KEY = 'portfolio-google-translate-reset'

function isExcluded(pathname = '/') {
  return EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function clearTranslateCookie() {
  const expired = 'Thu, 01 Jan 1970 00:00:00 GMT'
  document.cookie = `googtrans=; Path=/; Max-Age=0; Expires=${expired}; SameSite=Lax`

  const hostname = window.location.hostname
  if (hostname === 'farhanje.com' || hostname.endsWith('.farhanje.com')) {
    document.cookie = `googtrans=; Path=/; Domain=.farhanje.com; Max-Age=0; Expires=${expired}; SameSite=Lax`
  }
}

function hasActiveGoogleTranslate() {
  return Boolean(
    document.getElementById('google-translate-script') ||
    window.google?.translate ||
    document.querySelector('.goog-te-banner-frame, .goog-te-menu-frame, .goog-te-gadget, iframe.skiptranslate') ||
    document.documentElement.classList.contains('translated-ltr') ||
    document.documentElement.classList.contains('translated-rtl')
  )
}

function removeTranslateArtifacts() {
  document.getElementById('google-translate-script')?.remove()
  document.getElementById('google_translate_element')?.remove()

  document
    .querySelectorAll('.goog-te-banner-frame, .goog-te-menu-frame, .goog-te-gadget, .goog-te-balloon-frame, iframe.skiptranslate')
    .forEach((node) => node.remove())

  document.documentElement.classList.remove('translated-ltr', 'translated-rtl')
  document.body?.classList.remove('translated-ltr', 'translated-rtl')
  if (document.body) document.body.style.top = ''

  try {
    delete window.googleTranslateElementInit
  } catch (_) {
    window.googleTranslateElementInit = undefined
  }
}

export default function GoogleTranslateGate() {
  const pathname = usePathname() || '/'
  const excluded = isExcluded(pathname)

  useEffect(() => {
    if (excluded) {
      const wasActive = hasActiveGoogleTranslate()
      clearTranslateCookie()
      removeTranslateArtifacts()

      if (wasActive && sessionStorage.getItem(RESET_KEY) !== pathname) {
        sessionStorage.setItem(RESET_KEY, pathname)
        window.location.reload()
      }
      return
    }

    sessionStorage.removeItem(RESET_KEY)

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
  }, [excluded, pathname])

  if (excluded) return null

  return (
    <>
      <div id="google_translate_element" className="g-translate-hidden" />
      <GoogleTranslateCleanup />
    </>
  )
}
