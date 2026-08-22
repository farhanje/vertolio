'use client'

import {track as trackVercel} from '@vercel/analytics'

function cleanData(data = {}) {
  const out = {}
  for (const [key, value] of Object.entries(data || {})) {
    if (value == null) continue
    if (typeof value === 'string') out[key] = value.slice(0, 500)
    else if (typeof value === 'number' || typeof value === 'boolean') out[key] = value
    else out[key] = JSON.stringify(value).slice(0, 500)
  }
  return out
}

export function trackAnalytics(name, data = {}) {
  const payload = cleanData(data)

  try {
    if (typeof window !== 'undefined' && window.umami?.track) {
      window.umami.track(name, payload)
    }
  } catch (_) {}

  try {
    trackVercel(name, payload)
  } catch (_) {}
}

export function currentRecruiterCode() {
  if (typeof window === 'undefined') return ''
  try {
    const url = new URL(window.location.href)
    return url.searchParams.get('r') || ''
  } catch (_) {
    return ''
  }
}
