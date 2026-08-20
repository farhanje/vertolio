'use client'

import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import {normalizeLanguage, uiCopy} from '../lib/i18n'

export default function BackSmart({fallback = '/', lang = 'en'}) {
  const router = useRouter()
  const [canBack, setCanBack] = useState(false)
  const language = normalizeLanguage(lang)
  const copy = uiCopy(language)

  useEffect(() => {
    setCanBack(typeof window !== 'undefined' && window.history.length > 1)
  }, [])

  const onClick = () => {
    if (canBack) router.back()
    else router.push(fallback)
  }

  return (
    <button
      className={language === 'en' ? 'btn primary notranslate' : 'btn primary'}
      type="button"
      onClick={onClick}
      aria-label={copy.back}
    >
      ← {copy.back}
    </button>
  )
}
