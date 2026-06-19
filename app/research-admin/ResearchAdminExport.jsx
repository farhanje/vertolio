'use client'

import {useState} from 'react'

const datasets = [
  ['sessions', 'Sessions'],
  ['flow_steps', 'Flow steps'],
  ['task_runs', 'Task runs'],
  ['screen_events', 'Screen events'],
  ['survey_responses', 'Survey responses'],
]

function getFilename(disposition, fallback) {
  const match = /filename="?([^";]+)"?/i.exec(disposition || '')
  return match?.[1] || fallback
}

export default function ResearchAdminExport() {
  const [studySlug, setStudySlug] = useState('')
  const [dataset, setDataset] = useState('sessions')
  const [key, setKey] = useState('')
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setIsLoading(true)
    setStatus('Preparing export...')

    try {
      const response = await fetch('/api/research/export', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({studySlug, dataset, key}),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.detail || payload?.error || `Export failed: ${response.status}`)
      }

      const blob = await response.blob()
      const filename = getFilename(response.headers.get('content-disposition'), `${studySlug || 'research'}-${dataset}.csv`)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setStatus(`Downloaded ${filename}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="off" style={{marginTop: 32, border: '1px solid var(--hair)', padding: 24, display: 'grid', gap: 18, background: 'rgba(11,11,11,.02)'}}>
      <label style={{display: 'grid', gap: 8}}>
        <span className="smallcaps">Study slug</span>
        <input name="studySlug" value={studySlug} onChange={(event) => setStudySlug(event.target.value)} placeholder="kyc-autosave-ab" required autoComplete="off" style={{width: '100%', border: '1px solid var(--hair)', padding: '12px 14px', font: 'inherit', background: 'var(--bg)', color: 'var(--fg)'}} />
      </label>

      <label style={{display: 'grid', gap: 8}}>
        <span className="smallcaps">Dataset</span>
        <select name="dataset" value={dataset} onChange={(event) => setDataset(event.target.value)} style={{width: '100%', border: '1px solid var(--hair)', padding: '12px 14px', font: 'inherit', background: 'var(--bg)', color: 'var(--fg)'}}>
          {datasets.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      <label style={{display: 'grid', gap: 8}}>
        <span className="smallcaps">Export key</span>
        <input name="exportKey" type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder="RESEARCH_ADMIN_KEY" autoComplete="new-password" style={{width: '100%', border: '1px solid var(--hair)', padding: '12px 14px', font: 'inherit', background: 'var(--bg)', color: 'var(--fg)'}} />
        <span style={{fontSize: 13, color: 'var(--muted)'}}>The key is sent by POST, not placed in the URL.</span>
      </label>

      <div className="cta-row" style={{marginTop: 4}}>
        <button className="btn primary" type="submit" disabled={isLoading}>{isLoading ? 'Preparing...' : 'Download CSV'}</button>
        <a className="btn" href="/studio">Open Studio</a>
      </div>

      {status ? <p aria-live="polite" style={{margin: 0, color: 'var(--muted)', fontSize: 14}}>{status}</p> : null}
    </form>
  )
}
