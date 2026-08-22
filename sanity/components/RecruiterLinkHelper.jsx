'use client'

import {useMemo, useState} from 'react'
import {useFormValue} from 'sanity'

export default function RecruiterLinkHelper() {
  const code = useFormValue(['linkCode', 'current'])
  const company = useFormValue(['company'])
  const role = useFormValue(['role'])
  const [copied, setCopied] = useState(false)

  const publicUrl = useMemo(() => {
    if (!code) return ''
    if (typeof window === 'undefined') return `/for/${code}`
    return `${window.location.origin}/for/${code}`
  }, [code])

  const analyticsUrl = 'https://vercel.com/farhan-portfolio/farhanjamaludin/analytics'

  async function copyLink() {
    if (!publicUrl || typeof navigator === 'undefined') return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch (_) {}
  }

  const buttonStyle = {
    border: '1px solid rgba(0,0,0,.16)',
    borderRadius: 6,
    background: '#fff',
    padding: '7px 10px',
    fontSize: 12,
    cursor: code ? 'pointer' : 'default',
    color: '#111',
  }

  return (
    <div style={{border: '1px solid rgba(0,0,0,.12)', borderRadius: 8, padding: 14, background: '#fafafa'}}>
      <div style={{fontSize: 12, color: '#666', marginBottom: 6}}>Public recruiter link</div>
      <div style={{fontFamily: 'monospace', fontSize: 13, lineHeight: 1.5, wordBreak: 'break-all'}}>
        {publicUrl || 'Generate a Link code first.'}
      </div>

      <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12}}>
        <button type="button" style={buttonStyle} disabled={!code} onClick={copyLink}>
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <button
          type="button"
          style={buttonStyle}
          disabled={!code}
          onClick={() => code && window.open(publicUrl, '_blank', 'noopener,noreferrer')}
        >
          Open preview
        </button>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => window.open(analyticsUrl, '_blank', 'noopener,noreferrer')}
        >
          Open analytics
        </button>
      </div>

      <div style={{fontSize: 12, color: '#666', lineHeight: 1.5, marginTop: 12}}>
        Opens are visible in Vercel Web Analytics as <strong>/for/{code || 'your-code'}</strong>. The page also sends recruiter-specific events for portfolio opens, project clicks, Resume, and View all work.
        {company || role ? <div style={{marginTop: 5}}>Current context: {[company, role].filter(Boolean).join(' · ')}</div> : null}
      </div>
    </div>
  )
}
