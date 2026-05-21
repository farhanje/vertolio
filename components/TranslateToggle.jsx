'use client'

import {useEffect, useState} from 'react'

function setCookie(name, value, days = 7) {
  const d = new Date()
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`
}

function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : ''
}

export default function TranslateToggle({className = ''}) {
  const [isEN, setIsEN] = useState(false)

  useEffect(() => {
    // Detect current state from cookie or localStorage
    const stored = localStorage.getItem('lang')
    if (stored === 'en') {
      setIsEN(true)
      return
    }
    if (stored === 'id') {
      setIsEN(false)
      return
    }

    const gt = getCookie('googtrans')
    setIsEN(gt === '/id/en')
  }, [])

  const toggle = () => {
    const next = !isEN
    setIsEN(next)
    localStorage.setItem('lang', next ? 'en' : 'id')

    // Google translate cookie: /source/target
    // Indonesian default: /id/id, English: /id/en
    setCookie('googtrans', next ? '/id/en' : '/id/id')

    // Soft reload so Google applies translation across route
    window.location.reload()
  }

  return (
    <button
      type="button"
      className={className ? className : 'btn'}
      onClick={toggle}
      aria-label={isEN ? 'Switch to Indonesian' : 'Translate to English'}
      title={isEN ? 'Back to Indonesian' : 'Translate to English'}
    >
      {isEN ? 'ID' : 'Translate'}
    </button>
  )
}
