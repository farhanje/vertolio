'use client'

import { useState } from 'react'

const initialForm = {
  name: '',
  baseUrl: '',
  adapterKey: 'generic-html',
  frequency: 'every_6_hours',
  minimumConfidence: '0.90',
  maxPagesPerRun: '25',
}

async function readJson(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.detail || data.error || 'Request failed')
  return data
}

function money(value) {
  return `$${Number(value || 0).toFixed(4)}`
}

export default function PromoAdminActions({sources = [], adapters = [], llmConfig = {}, llmSummary = {}}) {
  const [runState, setRunState] = useState({status: 'idle', message: ''})
  const [addState, setAddState] = useState({status: 'idle', message: ''})
  const [llmState, setLlmState] = useState({status: 'idle', message: ''})
  const [sourceId, setSourceId] = useState('')
  const [form, setForm] = useState(initialForm)

  function updateField(key, value) {
    setForm((current) => ({...current, [key]: value}))
  }

  async function testLlm() {
    setLlmState({status: 'running', message: 'Testing Gemini connection…'})
    try {
      const data = await readJson(await fetch('/api/promo-admin/llm/test', {method: 'POST'}))
      const category = data.result?.category || 'unknown'
      const city = data.result?.city || 'unknown'
      setLlmState({
        status: 'done',
        message: `Connected in ${data.latencyMs} ms · ${category} · ${city} · ${data.inputTokens || 0} input / ${data.outputTokens || 0} output tokens · ${money(data.estimatedCostUsd)} paid-equivalent cost.`,
      })
    } catch (error) {
      setLlmState({status: 'error', message: String(error?.message || error)})
    }
  }

  async function runCheck() {
    setRunState({status: 'running', message: 'Running source check…'})

    try {
      const data = await readJson(await fetch('/api/promo-admin/run', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({sourceId: sourceId || null}),
      }))

      setRunState({
        status: 'done',
        message: `Finished. ${data.processed?.length || 0} job(s) processed. Refresh to see categories, cities, outlet records, and LLM usage.`,
      })
    } catch (error) {
      setRunState({status: 'error', message: String(error?.message || error)})
    }
  }

  async function installStarterSources() {
    setAddState({status: 'running', message: 'Installing starter sources…'})
    try {
      const data = await readJson(await fetch('/api/promo-admin/sources', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({preset: 'starter'}),
      }))
      const created = (data.results || []).filter((item) => item.created).length
      const updated = (data.results || []).filter((item) => item.updated).length
      setAddState({status: 'done', message: `${created} source(s) added and ${updated} source(s) updated for automatic publishing. Reloading…`})
      window.setTimeout(() => window.location.reload(), 700)
    } catch (error) {
      setAddState({status: 'error', message: String(error?.message || error)})
    }
  }

  async function addSource(event) {
    event.preventDefault()
    setAddState({status: 'running', message: 'Adding source…'})

    try {
      const data = await readJson(await fetch('/api/promo-admin/sources', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(form),
      }))
      setAddState({
        status: 'done',
        message: data.created ? 'Source added with a confidence gate. Reloading…' : 'That source already exists. Reloading…',
      })
      setForm(initialForm)
      window.setTimeout(() => window.location.reload(), 700)
    } catch (error) {
      setAddState({status: 'error', message: String(error?.message || error)})
    }
  }

  const fieldStyle = {
    width: '100%',
    minHeight: 42,
    border: '1px solid var(--hair)',
    background: 'var(--bg)',
    color: 'var(--fg)',
    padding: '9px 10px',
    font: 'inherit',
  }

  return (
    <div style={{display: 'grid', gap: 22, marginTop: 24, maxWidth: 900}}>
      <div style={{border: '1px solid var(--hair)', padding: 16, display: 'grid', gap: 12}}>
        <div>
          <strong>Gemini promo sorter</strong>
          <p style={{margin: '4px 0 0', color: 'var(--muted)', fontSize: 14}}>
            {llmConfig.provider || 'gemini'} · {llmConfig.model || 'gemini-3.1-flash-lite'} · {llmConfig.mode || 'new_changed'} mode · hard cap ${Number(llmConfig.monthlyBudgetUsd || 5).toFixed(2)}/month.
            {' '}{llmConfig.apiKeyConfigured ? 'API key detected.' : 'GEMINI_API_KEY is missing, so rules are used.'}
          </p>
          <p style={{margin: '6px 0 0', color: 'var(--muted)', fontSize: 13}}>
            This month: {llmSummary.calls || 0} model call(s), {llmSummary.cacheHits || 0} cache hit(s), {llmSummary.budgetSkips || 0} budget skip(s), {money(llmSummary.estimatedCostUsd)} paid-equivalent usage.
          </p>
        </div>
        <div>
          <button className="btn" type="button" onClick={testLlm} disabled={llmState.status === 'running' || !llmConfig.apiKeyConfigured}>
            {llmState.status === 'running' ? 'Testing…' : 'Test Gemini connection'}
          </button>
        </div>
        {llmState.message ? <span style={{fontSize: 14, color: llmState.status === 'error' ? 'var(--fg)' : 'var(--muted)'}}>{llmState.message}</span> : null}
        {!llmSummary.available && llmSummary.error ? (
          <span style={{fontSize: 13, color: 'var(--muted)'}}>Run the promo LLM budget migration before testing: {llmSummary.error}</span>
        ) : null}
      </div>

      <div style={{border: '1px solid var(--hair)', padding: 16, display: 'grid', gap: 10}}>
        <div>
          <strong>Recommended starting sources</strong>
          <p style={{margin: '4px 0 0', color: 'var(--muted)', fontSize: 14}}>
            Install BCA and Ultra Voucher with automatic high-confidence publishing. New or changed results are categorized and location-tagged; unchanged pages skip the LLM entirely.
          </p>
        </div>
        <div>
          <button className="btn primary" type="button" onClick={installStarterSources} disabled={addState.status === 'running'}>
            Install or update BCA + Ultra Voucher
          </button>
        </div>
      </div>

      <div style={{display: 'grid', gap: 10}}>
        <strong>Run a source check</strong>
        <div style={{display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap'}}>
          <select
            style={{...fieldStyle, width: 'auto', minWidth: 260}}
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
            aria-label="Source to check"
          >
            <option value="">All due sources</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>{source.name}</option>
            ))}
          </select>
          <button className="btn" type="button" onClick={runCheck} disabled={runState.status === 'running'}>
            {runState.status === 'running' ? 'Running…' : 'Run source check'}
          </button>
        </div>
        {runState.message ? <span style={{fontSize: 14, color: 'var(--muted)'}}>{runState.message}</span> : null}
      </div>

      <details style={{border: '1px solid var(--hair)', padding: 16}}>
        <summary style={{cursor: 'pointer', fontWeight: 800}}>Add another public source</summary>
        <p style={{color: 'var(--muted)', fontSize: 14, maxWidth: 720}}>
          Use the generic adapter for a new official public webpage. It starts behind a confidence gate; a dedicated adapter can be added later for special discovery or parsing rules.
        </p>

        <form onSubmit={addSource} style={{display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, marginTop: 16}}>
          <label style={{display: 'grid', gap: 6}}>
            <span style={{fontSize: 13, fontWeight: 700}}>Source name</span>
            <input required value={form.name} onChange={(event) => updateField('name', event.target.value)} style={fieldStyle} placeholder="Qpon promotions" />
          </label>

          <label style={{display: 'grid', gap: 6}}>
            <span style={{fontSize: 13, fontWeight: 700}}>Official public URL</span>
            <input required type="url" value={form.baseUrl} onChange={(event) => updateField('baseUrl', event.target.value)} style={fieldStyle} placeholder="https://example.com/promos" />
          </label>

          <label style={{display: 'grid', gap: 6}}>
            <span style={{fontSize: 13, fontWeight: 700}}>Adapter</span>
            <select value={form.adapterKey} onChange={(event) => updateField('adapterKey', event.target.value)} style={fieldStyle}>
              {adapters.map((adapter) => (
                <option key={adapter.key} value={adapter.key}>{adapter.label}</option>
              ))}
            </select>
          </label>

          <label style={{display: 'grid', gap: 6}}>
            <span style={{fontSize: 13, fontWeight: 700}}>Check frequency</span>
            <select value={form.frequency} onChange={(event) => updateField('frequency', event.target.value)} style={fieldStyle}>
              <option value="every_hour">Every hour</option>
              <option value="every_3_hours">Every 3 hours</option>
              <option value="every_6_hours">Every 6 hours</option>
              <option value="every_12_hours">Every 12 hours</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>

          <label style={{display: 'grid', gap: 6}}>
            <span style={{fontSize: 13, fontWeight: 700}}>Confidence threshold</span>
            <input type="number" min="0.5" max="1" step="0.01" value={form.minimumConfidence} onChange={(event) => updateField('minimumConfidence', event.target.value)} style={fieldStyle} />
          </label>

          <label style={{display: 'grid', gap: 6}}>
            <span style={{fontSize: 13, fontWeight: 700}}>Maximum pages per run</span>
            <input type="number" min="1" max="100" value={form.maxPagesPerRun} onChange={(event) => updateField('maxPagesPerRun', event.target.value)} style={fieldStyle} />
          </label>

          <div style={{gridColumn: '1 / -1'}}>
            <button className="btn primary" type="submit" disabled={addState.status === 'running'}>
              {addState.status === 'running' ? 'Adding…' : 'Add source with confidence gate'}
            </button>
          </div>
        </form>
      </details>

      {addState.message ? <span style={{fontSize: 14, color: 'var(--muted)'}}>{addState.message}</span> : null}
    </div>
  )
}
