'use client'

import {useEffect, useMemo, useState} from 'react'
import {normalizeLanguage} from '../lib/i18n'

const FLAG_ICONS = {
  en: '/flags/gb.svg',
  id: '/flags/id.svg',
}

function setCookie(name, value, opts = {}) {
  const days = opts.days ?? 365
  const d = new Date()
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000)
  const base = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`
  document.cookie = base
  if (opts.domain) document.cookie = `${base};domain=${opts.domain}`
}

function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : ''
}

export default function TranslateToggle({className = '', initialLang = 'en'}) {
  const [lang, setLang] = useState(normalizeLanguage(initialLang))

  const domain = useMemo(() => {
    if (typeof window === 'undefined') return null
    const h = window.location.hostname
    if (!h) return null
    const parts = h.split('.')
    if (parts.length >= 2) return `.${parts.slice(-2).join('.')}`
    return null
  }, [])

  useEffect(() => {
    const cookieLang = getCookie('portfolio_lang')
    if (cookieLang) setLang(normalizeLanguage(cookieLang))
  }, [])

  const apply = (next) => {
    const target = normalizeLanguage(next)
    if (target === lang) return

    setLang(target)
    localStorage.setItem('lang', target)

    setCookie('portfolio_lang', target, {domain})
    setCookie('lang', target, {domain})

    const googleCookie = target === 'en' ? '/id/en' : '/id/id'
    setCookie('googtrans', googleCookie, {domain})

    window.location.reload()
  }

  return (
    <div className={className ? `lang-inline ${className}` : 'lang-inline'} role="group" aria-label="Language">
      <button
        type="button"
        className={lang === 'en' ? 'lang-flag active' : 'lang-flag'}
        onClick={() => apply('en')}
        aria-pressed={lang === 'en'}
        aria-label="English"
        title="English"
      >
        <img className="lang-flag-img" src={FLAG_ICONS.en} alt="" aria-hidden="true" />
        <span className="sr-only">English</span>
      </button>

      <span className="lang-sep" aria-hidden="true">|</span>

      <button
        type="button"
        className={lang === 'id' ? 'lang-flag active' : 'lang-flag'}
        onClick={() => apply('id')}
        aria-pressed={lang === 'id'}
        aria-label="Bahasa Indonesia"
        title="Bahasa Indonesia"
      >
        <img className="lang-flag-img" src={FLAG_ICONS.id} alt="" aria-hidden="true" />
        <span className="sr-only">Bahasa Indonesia</span>
      </button>
    </div>
  )
}
