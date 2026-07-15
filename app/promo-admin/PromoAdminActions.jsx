'use client'

import { useState } from 'react'

const MAX_AUTOMATIC_BATCHES = 80

async function readJson(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.detail || data.error || 'Request failed')
  return data
}

function money(value) {
  return `$${Number(value || 0).toFixed(4)}`
}

function sleep(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

function totalCounters(processed = []) {
  return processed.reduce((totals, item) => {
    for (const [key, value] of Object.entries(item?.counters || {})) {
      totals[key] = Number(totals[key] || 0) + Number(value || 0)
    }
    return totals
  }, {})
}

function aiTotals(batches = []) {
  return batches.reduce((totals, batch) => {
    if (!batch) return totals
    totals.calls += ['success','cached'].includes(batch.status) ? 1 : 0
    totals.cacheHits += batch.status === 'cached' ? 1 : 0
    totals.claimed += Number(batch.claimed || 0)
    totals.resolved += Number(batch.resolved || 0)
    totals.unresolved += Number(batch.unresolved || 0)
    totals.cost += Number(batch.estimatedCostUsd || 0)
    return totals
  }, {calls: 0, cacheHits: 0, claimed: 0, resolved: 0, unresolved: 0, cost: 0})
}

function runSummary({processed, aiBatches, setup, remainingJobs, latestFailure, running = false}) {
  const totals = totalCounters(processed)
  const ai = aiTotals(aiBatches)
  const parts = [
    `${processed.length} source batch(es) finished`,
    `${totals.deterministic || 0} parsed without AI`,
    `${totals.aiQueued || 0} queued for bulk AI`,
    `${ai.calls} bulk AI call(s)`,
    `${ai.resolved} AI-resolved`,
    `${totals.created || 0} new`,
    `${totals.updated || 0} updated`,
    `${totals.notPromotion || 0} non-promos rejected`,
    `${totals.duplicates || 0} duplicates blocked`,
    `${totals.deleted || 0} expired removed`,
  ]

  if (ai.cacheHits) parts.push(`${ai.cacheHits} AI cache hit(s)`)
  if (ai.cost) parts.push(`${money(ai.cost)} batch cost`)
  if (setup?.reactivatedJobs) parts.push(`${setup.reactivatedJobs} delayed job(s) reactivated`)
  if (setup?.staleRecoveredJobs) parts.push(`${setup.staleRecoveredJobs} timed-out job(s) recovered`)
  if (setup?.queuedSources) parts.push(`${setup.queuedSources} source job(s) created`)
  if (remainingJobs) parts.push(`${remainingJobs} automation step(s) remaining`)
  if (running && remainingJobs) parts.push('continuing automatically…')
  if (latestFailure?.error_message) parts.push(`Latest selective AI error: ${latestFailure.error_message}`)

  return parts.join(' · ')
}

async function postEngineAction(action) {
  return readJson(await fetch('/api/promo-admin/run', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({action}),
  }))
}

export default function PromoAdminActions({sourceCount = 0, llmConfig = {}, llmSummary = {}}) {
  const [runState, setRunState] = useState({status: 'idle', message: ''})
  const [setupState, setSetupState] = useState({status: 'idle', message: ''})
  const [diagnosticState, setDiagnosticState] = useState({status: 'idle', message: ''})
  const [sourceForm, setSourceForm] = useState({name: '', baseUrl: ''})

  async function runAutomaticUpdate() {
    setRunState({status: 'running', message: 'Running deterministic source batches and selective AI only when needed…'})

    const processed = []
    const aiBatches = []
    let setup = null
    let remainingJobs = 0
    let latestFailure = null

    try {
      let data = await postEngineAction('start')
      setup = data
      processed.push(...(data.processed || []))
      if (data.aiBatch) aiBatches.push(data.aiBatch)
      remainingJobs = Number(data.remainingJobs || 0)
      latestFailure = data.latestAiFailure || null

      setRunState({
        status: latestFailure ? 'error' : 'running',
        message: runSummary({processed, aiBatches, setup, remainingJobs, latestFailure, running: !latestFailure}),
      })

      let batchNumber = 1
      while (remainingJobs > 0 && !latestFailure && batchNumber < MAX_AUTOMATIC_BATCHES) {
        await sleep(350)
        data = await postEngineAction('continue')
        processed.push(...(data.processed || []))
        if (data.aiBatch) aiBatches.push(data.aiBatch)
        remainingJobs = Number(data.remainingJobs || 0)
        latestFailure = data.latestAiFailure || null
        batchNumber += 1

        setRunState({
          status: latestFailure ? 'error' : 'running',
          message: runSummary({processed, aiBatches, setup, remainingJobs, latestFailure, running: !latestFailure}),
        })
      }

      if (latestFailure) {
        setRunState({
          status: 'error',
          message: runSummary({processed, aiBatches, setup, remainingJobs, latestFailure}),
        })
        return
      }

      if (remainingJobs > 0) {
        setRunState({
          status: 'done',
          message: `${runSummary({processed, aiBatches, setup, remainingJobs, latestFailure})} · Safety pause reached; the scheduled worker will continue automatically.`,
        })
        return
      }

      setRunState({
        status: 'done',
        message: runSummary({processed, aiBatches, setup, remainingJobs: 0, latestFailure: null}),
      })
      window.setTimeout(() => window.location.reload(), 1800)
    } catch (error) {
      const message = String(error?.message || error)
      const networkFailure = /failed to fetch|networkerror|load failed/i.test(message)
      setRunState({
        status: 'error',
        message: networkFailure
          ? `${runSummary({processed, aiBatches, setup, remainingJobs, latestFailure})} · One request lost its connection. Saved work is safe and the scheduled worker will resume it.`
          : `${runSummary({processed, aiBatches, setup, remainingJobs, latestFailure})} · ${message}`,
      })
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
        message: data.created ? 'Source added. The scheduler will process it automatically.' : 'Source already existed and was re-enabled.',
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
        message: `Gemini API responded in ${data.latencyMs} ms · ${data.inputTokens || 0} input / ${data.outputTokens || 0} output tokens · ${money(data.estimatedCostUsd)} paid-equivalent cost. Production uses it only for unresolved fields in bulk.`,
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
          <strong style={{fontSize: 18}}>Automatic promo engine</strong>
          <p style={{margin: '6px 0 0', color: 'var(--muted)', maxWidth: 720}}>
            The scheduler discovers pages, isolates each promo section, parses usable fields without AI, and sends only unresolved records to a small bulk AI batch. The button below is an optional immediate run.
          </p>
        </div>
        <div>
          <button className="btn primary" type="button" onClick={runAutomaticUpdate} disabled={runState.status === 'running' || sourceCount === 0}>
            {runState.status === 'running' ? 'Processing automation steps…' : 'Run now (optional)'}
          </button>
        </div>
        {runState.message ? <div style={{fontSize: 14, color: statusColor}}>{runState.message}</div> : null}
      </section>

      {!llmConfig.apiKeyConfigured ? (
        <section style={{border: '1px solid var(--hair)', padding: 16}}>
          <strong>Selective AI is unavailable</strong>
          <p style={{margin: '6px 0 0', color: 'var(--muted)', fontSize: 14}}>
            Complete deterministic promos still publish normally. Only genuinely unresolved records remain queued for review until a Gemini key is configured.
          </p>
        </section>
      ) : null}

      <details style={{border: '1px solid var(--hair)', padding: 16}}>
        <summary style={{cursor: 'pointer', fontWeight: 800}}>Add a source</summary>
        <p style={{color: 'var(--muted)', fontSize: 14, maxWidth: 720}}>
          Add an official public promotion listing. Generic sources use configurable boundaries; high-volume sources should receive a dedicated adapter before unrestricted auto-publishing.
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
            Selective Gemini: {llmConfig.apiKeyConfigured ? 'configured' : 'missing'} · Model: {llmConfig.model || 'gemini-3.1-flash-lite'} · This month: {llmSummary.calls || 0} calls, {llmSummary.failures || 0} failures, {money(llmSummary.estimatedCostUsd)} / ${Number(llmConfig.monthlyBudgetUsd || 5).toFixed(2)}.
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
