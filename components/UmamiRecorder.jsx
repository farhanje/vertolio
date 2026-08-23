'use client'

import {useEffect} from 'react'
import {usePathname} from 'next/navigation'

const RECORDER_SCRIPT_ID = 'umami-recorder-script'

function isPublicPortfolioPath(pathname = '') {
  if (pathname === '/' || pathname === '/resume' || pathname === '/about') return true

  return ['/work', '/blog', '/for'].some(
    (basePath) => pathname === basePath || pathname.startsWith(`${basePath}/`),
  )
}

function getRecorderUrl(trackerUrl) {
  try {
    const url = new URL(trackerUrl)
    url.pathname = url.pathname.replace(/\/[^/]*$/, '/recorder.js')
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch (_) {
    return ''
  }
}

export default function UmamiRecorder({trackerUrl, websiteId}) {
  const pathname = usePathname()

  useEffect(() => {
    if (!trackerUrl || !websiteId || !isPublicPortfolioPath(pathname)) return
    if (document.getElementById(RECORDER_SCRIPT_ID)) return

    const recorderUrl = getRecorderUrl(trackerUrl)
    if (!recorderUrl) return

    const script = document.createElement('script')
    script.id = RECORDER_SCRIPT_ID
    script.defer = true
    script.src = recorderUrl
    script.dataset.websiteId = websiteId
    document.head.appendChild(script)
  }, [pathname, trackerUrl, websiteId])

  return null
}
