'use client'

import {useFormValue} from 'sanity'
import {getOpeningTimeline} from '../../lib/birthday-timing'

export default function BirthdayTimingSummary() {
  const values = useFormValue(['transitionTiming'])
  const t = getOpeningTimeline(values)
  const segments = [
    {label: 'Portfolio', seconds: t.portfolioSeconds, color: '#151515'},
    {label: 'Line 1', seconds: t.firstLineSeconds, color: '#424242'},
    {label: 'Line 2', seconds: t.secondLineSeconds, color: '#696969'},
    {label: 'Line 3', seconds: t.thirdLineSeconds, color: '#8e8e8e'},
    {label: 'Reveal', seconds: t.revealSeconds, color: '#b6b6b6'},
  ]

  return (
    <div style={{padding: 16, border: '1px solid rgba(0,0,0,.14)', background: '#fafafa', fontSize: 13}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, flexWrap: 'wrap'}}>
        <strong>Opening duration: {t.totalSeconds.toFixed(1)} seconds</strong>
        <span style={{color: '#656565'}}>Story starts at {t.revealAt.toFixed(1)}s · wipe lasts {t.revealSeconds.toFixed(1)}s</span>
      </div>
      <div style={{display: 'flex', overflow: 'hidden', height: 9, gap: 2, margin: '13px 0 11px'}}>
        {segments.map((part) => (
          <div key={part.label} title={part.label + ': ' + part.seconds.toFixed(1) + 's'}
            style={{width: (part.seconds / t.totalSeconds * 100) + '%', background: part.color}} />
        ))}
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px 12px', color: '#555', fontSize: 11}}>
        {segments.map((part) => <span key={part.label}>{part.label}: {part.seconds.toFixed(1)}s</span>)}
      </div>
      <p style={{margin: '12px 0 0', color: '#666', lineHeight: 1.55}}>
        Edit the five values above, save, and replay the transition from the private preview.
        Your changes can be previewed without publishing or switching the homepage on.
      </p>
    </div>
  )
}
