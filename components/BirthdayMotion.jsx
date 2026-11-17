'use client'

import {useEffect, useRef} from 'react'

// Small, dependency-free motion layer. Native scrolling is never overridden.
export default function BirthdayMotion({children}) {
  const rootRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = Boolean(navigator.connection?.saveData)
    const scrollContainer = root.closest('.birthday-takeover-layer')
    const scroller = scrollContainer || window
    const reveal = Array.from(root.querySelectorAll('[data-birthday-reveal]'))
    const parallax = Array.from(root.querySelectorAll('[data-birthday-parallax]'))
    let frame = 0
    let observer = null

    if (!reduceMotion && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach(({target, isIntersecting}) => {
          if (isIntersecting) {
            target.classList.add('is-visible')
            observer.unobserve(target)
          }
        })
      }, {
        root: scrollContainer,
        threshold: 0.08,
        rootMargin: '0px 0px -5% 0px',
      })

      const viewportHeight = scrollContainer?.clientHeight || window.innerHeight
      reveal.forEach((node) => {
        const rect = node.getBoundingClientRect()
        if (rect.top <= viewportHeight * 0.88 && rect.bottom >= 0) {
          node.classList.add('is-visible')
        } else {
          observer.observe(node)
        }
      })

      root.classList.add('birthday-motion-enabled')
    }

    function update() {
      frame = 0
      const total = scrollContainer
        ? scrollContainer.scrollHeight - scrollContainer.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight
      const scrollY = scrollContainer ? scrollContainer.scrollTop : window.scrollY
      root.style.setProperty('--birthday-scroll-progress', String(total > 0 ? Math.min(1, Math.max(0, scrollY / total)) : 0))

      if (reduceMotion || saveData) return
      const viewportHeight = scrollContainer?.clientHeight || window.innerHeight
      parallax.forEach((node) => {
        const rect = node.getBoundingClientRect()
        if (rect.bottom < -100 || rect.top > viewportHeight + 100) return
        const centerProgress = (rect.top + rect.height / 2 - viewportHeight / 2) / Math.max(1, viewportHeight)
        const offset = Math.max(-18, Math.min(18, -centerProgress * 16))
        node.style.setProperty('--birthday-parallax-y', offset.toFixed(2) + 'px')
      })
    }

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    scroller.addEventListener('scroll', schedule, {passive: true})
    window.addEventListener('resize', schedule, {passive: true})
    schedule()

    return () => {
      scroller.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) window.cancelAnimationFrame(frame)
      if (observer) observer.disconnect()
      root.classList.remove('birthday-motion-enabled')
    }
  }, [])

  return (
    <div ref={rootRef} className="birthday-motion-root">
      <div className="birthday-scroll-indicator" aria-hidden="true" />
      {children}
    </div>
  )
}
