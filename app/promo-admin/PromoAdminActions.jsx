'use client'

import { useState } from 'react'

async function readJson(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.detail || data.error || 'Request failed')
  return data
}

function money(value) {
  return `$${Number(value || 0).toFixed(4)}`
}

function totalCounters(processed = []) {
  return processed.reduce((totals, item) => {
    for (const [key, value] of Object.entries(item?.counters || {})) {
      totals[key] = Number(totals[key] || 0) + Number(value || 0)
    }
    return totals
  }, {})
}

export default function PromoAdminActions({sourceCount = 0, llmConfig = {}, llmSummary = {}}) {
  const [runState, setRunState] = useState({status: 'idle', message: ''})
  const [setupState, setSetupState] = useState({status: 'idle', message: ''})
  const [diagnosticState, setDiagnosticState] = useState({status: 'idle', message: ''})
  const [sourceForm, setSourceForm] = useState({name: '', baseUrl: ''})

  async function runAutomaticUpdate() {
    setRunState({status: 'running', message: 'Reactivating delayed jobs and processing the active sources now…'})

    try {
      const data = await readJson(await fetch('/api/promo-admin/run', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({action: 'run_all'}),
      }))
      const totals = totalCounters(data.processed)
      const parts = [
        `${data.processed?.length || 0} source job(s) actually finished`,
        `${totals.aiEnriched || 0} AI-processed`,
        `${totals.created || 0} new`,
        `${totals.updated || 0} updated`,
        `${totals.notPromotion || 0} rejected as non-promos`,
        `${totals.duplicates || 0} duplicates blocked`,
        `${totals.deleted || 0} expired removed`,
      ]
      if (data.retryUnlocked) parts.push(`${data.retryUnlocked} incomplete promo(s) unlocked for AI retry`)
      if (data.reactivatedJobs) parts.push(`${data.reactivatedJobs} delayed source job(s) reactivated`)
      if (data.queuedSources) parts.push(`${data.queuedSources} new source job(s) created`)
      if (data.alreadyRunningJobs) parts.push(`${data.alreadyRunningJobs} source job(s) already running`)
      if (totals.llmCalled) parts.push(`${totals.llmCalled} Gemini call(s)`)
      if (totals.llmCached) parts.push(`${totals.llmCached} cache hit(s)`)
      if (totals.llmFailed) parts.push(`${totals.llmFailed} Gemini failure(s)`)
      if (data.remainingJobs) parts.push(`${data.remainingJobs} job(s) still active`)
      if (data.latestAiFailure?.error_message) {
        parts.push(`Latest Gemini error: ${data.latestAiFailure.error_message}`)
      }
      if (!data.processed?.length && data.remainingJobs) {
        parts.push('No job was claimable in this request; the active-job status above explains why')
      }
      setRunState({
        status: data.latestAiFailure ? 'error' : 'done',
        message: parts.join(' · '),
      })
      window.setTimeout(() => window.location.reload(), data.latestAiFailure ? 4500 : 2200)
    } catch (error) {
      setRunState({status: 'error', message: String(error?.message || error)})
    }
  }

  async function addSource(event) {
    event.preventDefault()
    setSetupState({status: 'running', message: 'Adding official source…'})

    try {
      const data = await readJson(await fetch('/api/promo-admin/sources', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          ...sourceForm,
          adapterKey: 'generic-html',
          frequency: 'every_6_hours',
          minimumConfidence: 0.85,
          maxPagesPerRun: 25,
        }),
      }))
      setSetupState({
        status: 'done',
        message: data.created ? 'Source added. It will be included in the next automatic update.' : 'Source already existed and was re-enabled.',
      })
      setSourceForm({name: '', baseUrl: ''})
      window.setTimeout(() => window.location.reload(), 900)
    } catch (error) {
      setSetupState({status: 'error', message: String(error?.message || error)})
    }
  }

  async function installStarterSources() {
    setSetupState({status: 'running', message: 'Updating starter sources…'})
    try {
      const data = await readJson(await fetch('/api/promo-admin/sources', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({preset: 'starter'}),
      }))
      const created = (data.results || []).filter((item) => item.created).length
      const updated = (data.results || []).filter((item) => item.updated).length
      setSetupState({status: 'done', message: `${created} starter source(s) added · ${updated} refreshed.`})
      window.setTimeout(() => window.location.reload(), 900)
    } catch (error) {
      setSetupState({status: 'error', message: String(error?.message || error)})
    }
  }

  async function testConnection() {
    setDiagnosticState({status: 'running', message: 'Testing Gemini API access…'})
    try {
      const data = await readJson(await fetch('/api/promo-admin/llm/test', {method: 'POST'}))
      setDiagnosticState({
        status: 'done',
        message: `Gemini API responded in ${data.latencyMs} ms · ${data.inputTokens || 0} input / ${data.outputTokens || 0} output tokens · ${money(data.estimatedCostUsd)} paid-equivalent cost. This confirms API access only; Run automatic update confirms full promo extraction.`,
      })
    } catch (error) {
      setDiagnosticState({status: 'error', message: String(error?.message || error)})
    }
  }

  const statusColor = runState.status === 'error' ? 'var(--fg)' : 'var(--muted)'
  const inputStyle = {
    minHeight: 44,
    border: '1px solid var(--hair)',
    background: 'var(--bg)',
    color: 'var(--fg)',
    padding: '10px 12px',
    font: 'inherit',
    width: '100%',
  }

  return (
    <div style={{display: 'grid', gap: 18, marginTop: 28, maxWidth: 920}}>
      <section style={{border: '1px solid var(--hair)', padding: 20, display: 'grid', gap: 14}}>
        <div>
          <strong style={{fontSize: 18}}>Run the promo engine</strong>
          <p style={{margin: '6px 0 0', color: 'var(--muted)', maxWidth: 720}}>
            Checks all {sourceCount} active source(s), immediately reactivates delayed retries, verifies terms with Gemini, blocks duplicates, and removes expired promos automatically.
          </p>
        </div>
        <div>
          <button className="btn primary" type="button" onClick={runAutomaticUpdate} disabled={runState.status === 'running' || sourceCount === 0}>
            {runState.status === 'running' ? 'Running automatic update…' : 'Run automatic update'}
          </button>
        </div>
        {runState.message ? <div style={{fontSize: 14, color: statusColor}}>{runState.message}</div> : null}
      </section>

      {!llmConfig.apiKeyConfigured ? (
        <section style={{border: '1px solid var(--hair)', padding: 16}}>
          <strong>Gemini API key is missing</strong>
          <p style={{margin: '6px 0 0', color: 'var(--muted)', fontSize: 14}}>
            The engine will still run with rules, but full date, eligibility, quota, category, and location interpretation requires GEMINI_API_KEY in Vercel Production.
          </p>
        </section>
      ) : null}

      <details style={{border: '1px solid var(--hair)', padding: 16}}>
        <summary style={{cursor: 'pointer', fontWeight: 800}}>Add a source</summary>
        <p style={{color: 'var(--muted)', fontSize: 14, maxWidth: 720}}>
          Add the official promotion listing URL from a bank, wallet, voucher platform, or merchant. The default crawler checks it every six hours.
        </p>
        <form onSubmit={addSource} style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr) auto', gap: 10, alignItems: 'end', marginTop: 14}}>
          <label style={{display: 'grid', gap: 6}}>
            <span style={{fontSize: 13, fontWeight: 700}}>Source name</span>
            <input required value={sourceForm.name} onChange={(event) => setSourceForm((current) => ({...current, name: event.target.value}))} style={inputStyle} placeholder="Bank Jago Promotions" />
          </label>
          <label style={{display: 'grid', gap: 6}}>
            <span style={{fontSize: 13, fontWeight: 700}}>Official promo URL</span>
            <input required type="url" value={sourceForm.baseUrl} onChange={(event) => setSourceForm((current) => ({...current, baseUrl: event.target.value}))} style={inputStyle} placeholder="https://www.example.com/promotions" />
          </label>
          <button className="btn" type="submit" disabled={setupState.status === 'running'}>Add source</button>
        </form>
        {setupState.message ? <div style={{fontSize: 14, color: setupState.status === 'error' ? 'var(--fg)' : 'var(--muted)', marginTop: 10}}>{setupState.message}</div> : null}
      </details>

      <details style={{border: '1px solid var(--hair)', padding: 16}}>
        <summary style={{cursor: 'pointer', fontWeight: 800}}>Setup and diagnostics</summary>
        <div style={{display: 'grid', gap: 12, marginTop: 14}}>
          <div style={{fontSize: 14, color: 'var(--muted)'}}>
            Gemini API key: {llmConfig.apiKeyConfigured ? 'configured' : 'missing'} · Model: {llmConfig.model || 'gemini-3.1-flash-lite'} · This month: {llmSummary.calls || 0} calls, {llmSummary.failures || 0} failures, {money(llmSummary.estimatedCostUsd)} / ${Number(llmConfig.monthlyBudgetUsd || 5).toFixed(2)}.
          </div>
          <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
            <button className="btn" type="button" onClick={testConnection} disabled={diagnosticState.status === 'running' || !llmConfig.apiKeyConfigured}>
              {diagnosticState.status === 'running' ? 'Testing…' : 'Test Gemini API access'}
            </button>
            <button className="btn" type="button" onClick={installStarterSources} disabled={setupState.status === 'running'}>
              Restore BCA + Ultra Voucher
            </button>
          </div>
          {diagnosticState.message ? <div style={{fontSize: 14, color: diagnosticState.status === 'error' ? 'var(--fg)' : 'var(--muted)'}}>{diagnosticState.message}</div> : null}
          {!llmSummary.available && llmSummary.error ? <div style={{fontSize: 13, color: 'var(--muted)'}}>Database setup required: {llmSummary.error}</div> : null}
        </div>
      </details>
    </div>
  )
}
