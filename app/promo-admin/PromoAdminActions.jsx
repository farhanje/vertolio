'use client'

import { useState } from 'react'

export default function PromoAdminActions({sources = []}) {
  const [state, setState] = useState({ status: 'idle', message: '' })
  const [sourceId, setSourceId] = useState('')

  async function runCheck() {
    setState({ status: 'running', message: 'Running source check…' })

    try {
      const response = await fetch('/api/promo-admin/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourceId: sourceId || null }),
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.detail || data.error || 'Request failed')
      setState({
        status: 'done',
        message: `Finished. ${data.processed?.length || 0} job(s) processed. Refresh to see the latest status.`,
      })
    } catch (error) {
      setState({ status: 'error', message: String(error?.message || error) })
    }
  }

  return (
    <div style={{display: 'grid', gap: 10, marginTop: 20, maxWidth: 720}}>
      <div style={{display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap'}}>
        <select
          className="btn"
          value={sourceId}
          onChange={(event) => setSourceId(event.target.value)}
          aria-label="Source to check"
        >
          <option value="">All due sources</option>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>{source.name}</option>
          ))}
        </select>
        <button className="btn primary" type="button" onClick={runCheck} disabled={state.status === 'running'}>
          {state.status === 'running' ? 'Running…' : 'Run source check'}
        </button>
      </div>
      {state.message ? <span style={{fontSize: 14, color: 'var(--muted)'}}>{state.message}</span> : null}
    </div>
  )
}
