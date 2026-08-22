'use client'

import {useEffect} from 'react'
import {trackAnalytics} from '../lib/analytics.client'

function classifyLink(href) {
  if (!href) return null
  if (href.startsWith('mailto:')) return {name: 'contact_click', data: {channel: 'email'}}
  if (href.startsWith('tel:')) return {name: 'contact_click', data: {channel: 'phone'}}
  if (href === '/resume' || href.startsWith('/resume?')) return {name: 'resume_open', data: {target: 'resume'}}

  try {
    const url = new URL(href, window.location.origin)
    if (url.hostname.includes('linkedin.com')) return {name: 'linkedin_click', data: {destination: url.hostname}}
    if (url.origin !== window.location.origin) {
      return {name: 'external_link', data: {destination: url.hostname, path: url.pathname}}
    }
  } catch (_) {}

  return null
}

export default function AnalyticsBridge() {
  useEffect(() => {
    const onClick = (event) => {
      const anchor = event.target?.closest?.('a[href]')
      if (!anchor) return

      const href = anchor.getAttribute('href') || ''
      const classified = classifyLink(href)
      if (!classified) return

      trackAnalytics(classified.name, {
        ...classified.data,
        source_path: window.location.pathname,
      })
    }

    document.addEventListener('click', onClick, {capture: true})
    return () => document.removeEventListener('click', onClick, {capture: true})
  }, [])

  return null
}
