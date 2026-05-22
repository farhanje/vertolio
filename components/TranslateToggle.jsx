'use client'

import {useEffect, useMemo, useState} from 'react'

function setCookie(name, value, opts = {}) {
  const days = opts.days ?? 7
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

function normalizeLang(v) {
  if (!v) return 'id'
  return String(v).toLowerCase() === 'en' ? 'en' : 'id'
}

export default function TranslateToggle({className = ''}) {
  const [lang, setLang] = useState('id')

  const domain = useMemo(() => {
    if (typeof window === 'undefined') return null
    const h = window.location.hostname
    if (!h) return null
    const parts = h.split('.')
    if (parts.length >= 2) return `.${parts.slice(-2).join('.')}`
    return null
  }, [])

  useEffect(() => {
    const storedRaw = localStorage.getItem('lang')
    if (storedRaw) {
      setLang(normalizeLang(storedRaw))
      return
    }
    const gt = getCookie('googtrans')
    setLang(gt === '/id/en' ? 'en' : 'id')
  }, [])

  const apply = (next) => {
    const target = normalizeLang(next)
    if (target === lang) return

    setLang(target)
    localStorage.setItem('lang', target)

    const cookieVal = target === 'en' ? '/id/en' : '/id/id'
    setCookie('googtrans', cookieVal, {domain})

    const url = new URL(window.location.href)
    url.searchParams.set('lang', target)
    window.location.href = url.toString()
  }

  return (
    <div className={className ? `lang-inline ${className}` : 'lang-inline'} role="group" aria-label="Language">
      <button type="button" className={lang === 'id' ? 'lang-link active' : 'lang-link'} onClick={() => apply('id')} aria-pressed={lang === 'id'}>
        ID
      </button>
      <span className="lang-sep" aria-hidden="true">|</span>
      <button type="button" className={lang === 'en' ? 'lang-link active' : 'lang-link'} onClick={() => apply('en')} aria-pressed={lang === 'en'}>
        EN
      </button>
    </div>
  )
}
