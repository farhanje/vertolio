'use client'

import {useState} from 'react'

export default function SharePromoButton({title, className = ''}) {
  const [label, setLabel] = useState('Bagikan promo')

  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({title, url})
        return
      }
      await navigator.clipboard.writeText(url)
      setLabel('Link tersalin')
      window.setTimeout(() => setLabel('Bagikan promo'), 1800)
    } catch (error) {
      if (error?.name === 'AbortError') return
      setLabel('Gagal menyalin')
      window.setTimeout(() => setLabel('Bagikan promo'), 1800)
    }
  }

  return <button type="button" className={className} onClick={share}>{label}</button>
}
