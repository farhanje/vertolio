'use client'

import {useEffect} from 'react'
import {track} from '@vercel/analytics'

function safeTrack(name, payload) {
  try {
    track(name, payload)
  } catch (_) {}
}

export function RecruiterOpenTracker({code, company, role}) {
  useEffect(() => {
    if (!code) return

    const key = `recruiter-open:${code}`
    let alreadyTracked = false

    try {
      alreadyTracked = window.sessionStorage.getItem(key) === '1'
      if (!alreadyTracked) window.sessionStorage.setItem(key, '1')
    } catch (_) {}

    if (!alreadyTracked) {
      safeTrack('recruiter_portfolio_open', {
        code,
        company: company || 'Unknown',
        role: role || 'Unspecified',
      })
    }
  }, [code, company, role])

  return null
}

export function RecruiterTrackedLink({
  href,
  eventName,
  code,
  company,
  target,
  className,
  children,
  ...props
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => {
        safeTrack(eventName, {
          code: code || 'unknown',
          company: company || 'Unknown',
          target: target || href,
        })
      }}
      {...props}
    >
      {children}
    </a>
  )
}
