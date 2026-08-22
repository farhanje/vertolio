'use client'

import {useEffect} from 'react'
import {currentRecruiterCode, trackAnalytics} from '../lib/analytics.client'

const MILESTONES = [25, 50, 75, 100]

export default function ContentEngagementTracker({contentType, slug, contentId = 'content'}) {
  useEffect(() => {
    if (!slug) return

    const sent = new Set()
    let ticking = false
    const recruiterCode = currentRecruiterCode()

    const trackDepth = () => {
      ticking = false
      const root = document.getElementById(contentId)
      if (!root) return

      const rect = root.getBoundingClientRect()
      const viewportH = window.innerHeight || document.documentElement.clientHeight || 0
      const rootTop = rect.top + window.scrollY
      const rootHeight = Math.max(1, root.offsetHeight)
      const viewedBottom = window.scrollY + viewportH
      const progress = Math.max(0, Math.min(100, Math.round(((viewedBottom - rootTop) / rootHeight) * 100)))

      MILESTONES.forEach((depth) => {
        if (progress < depth || sent.has(depth)) return
        sent.add(depth)
        trackAnalytics('content_depth', {
          content_type: contentType || 'content',
          slug,
          depth,
          recruiter_code: recruiterCode || undefined,
        })
      })
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(trackDepth)
    }

    trackAnalytics('content_open', {
      content_type: contentType || 'content',
      slug,
      recruiter_code: recruiterCode || undefined,
    })

    const engaged30 = window.setTimeout(() => {
      trackAnalytics('content_engaged_30s', {
        content_type: contentType || 'content',
        slug,
        recruiter_code: recruiterCode || undefined,
      })
    }, 30000)

    window.addEventListener('scroll', onScroll, {passive: true})
    window.addEventListener('resize', onScroll)
    trackDepth()

    return () => {
      window.clearTimeout(engaged30)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [contentId, contentType, slug])

  return null
}
