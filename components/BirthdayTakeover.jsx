'use client'

import {useEffect, useRef, useState} from 'react'
import {getOpeningTimeline} from '../lib/birthday-timing'

// Keeps the real portfolio in view briefly, then reveals the birthday edition
// through a typographic interlude and a single cinematic wipe.
export default function BirthdayTakeover({portfolio, birthday, introLines = [], transitionTiming}) {
  const [phase, setPhase] = useState('portfolio')
  const timeline = getOpeningTimeline(transitionTiming)
  const overlayRef = useRef(null)
  const snapshotRef = useRef(null)
  const showing = phase !== 'portfolio'
  const ready = phase === 'birthday'
  const lines = [
    introLines[0] || 'Usually, this little corner of the internet is about me.',
    introLines[1] || 'But not today.',
    introLines[2] || "Today, it's all about her.",
  ]

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      const timer = window.setTimeout(() => setPhase('birthday'), 650)
      return () => window.clearTimeout(timer)
    }
    const steps = [
      window.setTimeout(() => setPhase('intro-1'), Math.round(timeline.firstLineAt * 1000)),
      window.setTimeout(() => setPhase('intro-2'), Math.round(timeline.secondLineAt * 1000)),
      window.setTimeout(() => setPhase('intro-3'), Math.round(timeline.thirdLineAt * 1000)),
      window.setTimeout(() => setPhase('birthday'), Math.round(timeline.revealAt * 1000)),
    ]
    return () => steps.forEach(window.clearTimeout)
  }, [timeline.firstLineAt, timeline.secondLineAt, timeline.thirdLineAt, timeline.revealAt])

  useEffect(() => {
    if (!showing) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [showing])

  useEffect(() => {
    if (!showing) return undefined
    const elements = [snapshotRef.current, document.querySelector('.nav'), document.querySelector('.nav-mobilebar'), document.querySelector('.footer')].filter(Boolean)
    elements.forEach((element) => element.setAttribute('inert', ''))
    return () => elements.forEach((element) => element.removeAttribute('inert'))
  }, [showing])

  useEffect(() => {
    if (phase === 'birthday') {
      overlayRef.current?.focus({preventScroll: true})
    }
  }, [phase])

  const introIndex = phase === 'intro-1' ? 0 : phase === 'intro-2' ? 1 : 2

  return (
    <div className={'birthday-takeover-shell' + (showing ? ' has-started' : '')} style={{'--birthday-curtain-duration': `${timeline.revealSeconds}s`}}>
      <div ref={snapshotRef} className="birthday-portfolio-snapshot" aria-hidden={showing ? 'true' : undefined}>{portfolio}</div>

      <div
        ref={overlayRef}
        className={'birthday-takeover-layer' + (showing ? ' is-showing' : '') + (ready ? ' is-revealed' : '')}
        aria-hidden={!showing}
        role={showing ? 'region' : undefined}
        aria-label={showing ? 'Birthday story' : undefined}
        tabIndex={ready ? -1 : undefined}
      >
        <div className="birthday-takeover-content" aria-hidden={!ready}>
          {birthday}
        </div>
        <div className="birthday-intro-curtain" aria-hidden={ready}>
          {showing && !ready ? (
            <div className="birthday-intro" key={phase} aria-live="polite">
              <div className="birthday-intro-masthead">
                <span>FARHANJE.COM</span>
                <span>AN INTERRUPTION / 01</span>
              </div>
              <div className="birthday-intro-copy">
                <span className="birthday-intro-index">{String(introIndex + 1).padStart(2, '0')} / 03</span>
                <p>{lines[introIndex]}</p>
              </div>
              <div className="birthday-intro-rule"><span /></div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
