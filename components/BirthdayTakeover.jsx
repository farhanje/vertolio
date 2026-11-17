'use client'

import {useEffect, useState} from 'react'

export default function BirthdayTakeover({portfolio, birthday, introLines = []}) {
  const [phase, setPhase] = useState('portfolio')
  const lines = [
    introLines[0] || 'Usually, this little corner of the internet is about me.',
    introLines[1] || 'But not today.',
    introLines[2] || "Today, it's all about her.",
  ]

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      const timer = window.setTimeout(() => setPhase('birthday'), 700)
      return () => window.clearTimeout(timer)
    }
    const steps = [
      window.setTimeout(() => setPhase('intro-1'), 900),
      window.setTimeout(() => setPhase('intro-2'), 1800),
      window.setTimeout(() => setPhase('intro-3'), 2750),
      window.setTimeout(() => setPhase('birthday'), 3900),
    ]
    return () => steps.forEach(window.clearTimeout)
  }, [])

  useEffect(() => {
    if (phase === 'portfolio') return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [phase])

  const showing = phase !== 'portfolio'
  const ready = phase === 'birthday'
  const index = phase === 'intro-1' ? 0 : phase === 'intro-2' ? 1 : 2

  return (
    <>
      <div aria-hidden={showing ? 'true' : undefined}>{portfolio}</div>
      <div className={'birthday-takeover-layer' + (showing ? ' is-showing' : '') + (ready ? ' is-revealed' : '')} aria-hidden={!showing}>
        {!ready ? (
          <div className="birthday-intro" key={phase} aria-live="polite">
            <span>FARHANJE.COM</span>
            <p>{lines[index]}</p>
          </div>
        ) : birthday}
      </div>
    </>
  )
}
