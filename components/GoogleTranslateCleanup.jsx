'use client'

import {useEffect} from 'react'

export default function GoogleTranslateCleanup() {
  useEffect(() => {
    const cleanup = () => {
      try {
        // Remove/hide banner iframe
        const iframes = Array.from(document.querySelectorAll('iframe.goog-te-banner-frame, iframe[id^="goog-gt-"], iframe.goog-te-menu-frame'))
        for (const f of iframes) {
          f.style.display = 'none'
          f.style.visibility = 'hidden'
          f.style.height = '0'
        }

        // Hide translate injected containers
        const nodes = Array.from(document.querySelectorAll('.goog-te-banner-frame, .goog-te-balloon-frame, #goog-gt-tt, .goog-te-spinner-pos, .goog-tooltip, .goog-tooltip:hover, .goog-text-highlight, body > .skiptranslate'))
        for (const n of nodes) {
          n.style.display = 'none'
          n.style.visibility = 'hidden'
        }

        // Reset body top offset Google adds
        document.body.style.top = '0px'
        document.documentElement.style.top = '0px'
      } catch (_) {}
    }

    cleanup()
    const id = window.setInterval(cleanup, 400)
    return () => window.clearInterval(id)
  }, [])

  return null
}
