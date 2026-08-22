'use client'

import {useEffect} from 'react'
import {trackAnalytics} from '../lib/analytics.client'

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
      trackAnalytics('recruiter_portfolio_open', {
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
        trackAnalytics(eventName, {
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
