'use client'

import { useMemo, useState } from 'react'

function readJson(response) {
  return response.json().catch(() => ({})).then((data) => {
    if (!response.ok) throw new Error(data.detail || data.error || 'Request failed')
    return data
  })
}

function toDateInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${map.year}-${map.month}-${map.day}`
}

function displayDate(value) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString('en-GB', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function compactList(value) {
  return Array.isArray(value) ? value.join(', ') : String(value || '')
}

function suggestedFields(item) {
  const suggested = item.correction && Object.keys(item.correction).length
    ? item.correction
    : item.suggested_fields || {}
  const promo = item.promotion || {}

  return {
    title: suggested.title ?? promo.title ?? '',
    merchant: suggested.merchant ?? promo.merchant ?? '',
    provider: suggested.provider ?? promo.provider ?? '',
    paymentMethods: compactList(suggested.paymentMethods ?? promo.payment_methods),
    minimumSpend: suggested.minimumSpend ?? promo.minimum_spend ?? '',
    benefitType: suggested.benefitType ?? promo.benefit_type ?? '',
    benefitValue: suggested.benefitValue ?? promo.benefit_value ?? '',
    maximumBenefit: suggested.maximumBenefit ?? promo.maximum_benefit ?? '',
    voucherCode: suggested.voucherCode ?? promo.voucher_code ?? '',
    startsAt: toDateInput(suggested.startsAt ?? promo.starts_at),
    expiresAt: toDateInput(suggested.expiresAt ?? promo.expires_at),
    applicableDays: compactList(suggested.applicableDays ?? promo.applicable_days),
    eligibility: JSON.stringify(suggested.eligibility ?? promo.eligibility ?? {}, null, 2),
    channels: compactList(suggested.channels ?? promo.channels),
    termsText: suggested.termsText ?? promo.terms_text ?? '',
  }
}

function Field({label, children, wide = false}) {
  return (
    <label style={{display: 'grid', gap: 6, gridColumn: wide ? '1 / -1' : undefined}}>
      <span style={{fontSize: 12, fontWeight: 800, letterSpacing: '.02em'}}>{label}</span>
      {children}
    </label>
  )
}

function ReasonPills({reasons = []}) {
  if (!reasons.length) return <span style={{fontSize: 13, color: 'var(--muted)'}}>No warning was recorded.</span>

  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: 7}}>
      {reasons.map((reason) => (
        <span key={reason} className="pill" style={{fontSize: 11}}>{String(reason).replaceAll('_', ' ')}</span>
      ))}
    </div>
  )
}

function ReviewCard({item, candidates, onResolved}) {
  const [fields, setFields] = useState(() => suggestedFields(item))
  const [note, setNote] = useState('')
  const [targetPromotionId, setTargetPromotionId] = useState('')
  const [state, setState] = useState({status: 'idle', message: ''})

  const source = item.source || {}
  const document = item.document || {}
  const promotion = item.promotion || {}
  const confidence = Number(document.extraction_confidence ?? promotion.extraction_confidence ?? 0)

  const mergeOptions = useMemo(() => {
    return candidates
      .filter((candidate) => candidate.id !== promotion.id)
      .sort((a, b) => {
        const aSame = a.source_id === promotion.source_id ? 0 : 1
        const bSame = b.source_id === promotion.source_id ? 0 : 1
        if (aSame !== bSame) return aSame - bSame
        return String(a.title || '').localeCompare(String(b.title || ''))
      })
      .slice(0, 200)
  }, [candidates, promotion.id, promotion.source_id])

  const inputStyle = {
    width: '100%',
    minHeight: 42,
    border: '1px solid var(--hair)',
    background: 'var(--bg)',
    color: 'var(--fg)',
    padding: '9px 10px',
    font: 'inherit',
  }

  function update(key, value) {
    setFields((current) => ({...current, [key]: value}))
  }

  async function resolve(action) {
    if (action === 'merge' && !targetPromotionId) {
      setState({status: 'error', message: 'Choose the promotion this duplicate should merge into.'})
      return
    }

    setState({status: 'running', message: `${action === 'approve' ? 'Approving' : action === 'reject' ? 'Rejecting' : 'Merging'}…`})

    try {
      const data = await readJson(await fetch('/api/promo-admin/reviews', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          action,
          reviewId: item.id,
          fields,
          note,
          targetPromotionId: targetPromotionId || null,
        }),
      }))

      setState({status: 'done', message: `Review ${data.action}.`})
      window.setTimeout(() => onResolved(item.id), 350)
    } catch (error) {
      setState({status: 'error', message: String(error?.message || error)})
    }
  }

  async function retrySource() {
    if (!source.id) return
    setState({status: 'running', message: 'Retrying source extraction…'})

    try {
      const data = await readJson(await fetch('/api/promo-admin/run', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({sourceId: source.id}),
      }))
      setState({
        status: 'done',
        message: `Source retry finished. ${data.processed?.length || 0} job(s) processed. Reload later to inspect new review records.`,
      })
    } catch (error) {
      setState({status: 'error', message: String(error?.message || error)})
    }
  }

  return (
    <article style={{border: '1px solid var(--hair)', padding: 18, display: 'grid', gap: 20}}>
      <header style={{display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap'}}>
        <div style={{display: 'grid', gap: 6, minWidth: 0}}>
          <div className="kicker"><span className="dot" /> {source.name || 'Unknown source'}</div>
          <h2 style={{fontSize: 25}}>{promotion.title || document.source_title || 'Untitled promotion'}</h2>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 13, color: 'var(--muted)'}}>
            <span>Queued {displayDate(item.created_at)}</span>
            <span>·</span>
            <span>Confidence {Math.round(confidence * 100)}%</span>
            <span>·</span>
            <span>{source.adapter_key || 'unknown adapter'}</span>
          </div>
        </div>

        <div style={{display: 'flex', alignItems: 'start', gap: 8, flexWrap: 'wrap'}}>
          {promotion.source_url ? (
            <a className="btn" href={promotion.source_url} target="_blank" rel="noreferrer">Open source ↗</a>
          ) : null}
          <button className="btn" type="button" onClick={retrySource} disabled={!source.id || state.status === 'running'}>
            Retry source
          </button>
        </div>
      </header>

      <section style={{display: 'grid', gap: 10}}>
        <strong>Why this needs review</strong>
        <ReasonPills reasons={item.reasons || document.ambiguity_warnings || []} />
      </section>

      <details style={{border: '1px solid var(--hair2)', padding: 14}}>
        <summary style={{cursor: 'pointer', fontWeight: 800}}>Source evidence and extracted text</summary>
        <div style={{display: 'grid', gap: 12, marginTop: 14}}>
          <div style={{fontSize: 13, color: 'var(--muted)'}}>
            Canonical URL: {document.canonical_url || promotion.canonical_url || 'Unknown'}
          </div>
          <pre style={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 420, overflow: 'auto', border: '1px solid var(--hair2)', padding: 14, margin: 0, fontSize: 12}}>
            {document.raw_relevant_text || 'No extracted source text was stored.'}
          </pre>
        </div>
      </details>

      <section style={{display: 'grid', gap: 14}}>
        <div>
          <strong>Corrected promotion fields</strong>
          <p style={{margin: '4px 0 0', color: 'var(--muted)', fontSize: 13}}>
            Approval saves these values, recalculates deal value, and publishes the promotion.
          </p>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 13}}>
          <Field label="Title" wide>
            <input required value={fields.title} onChange={(event) => update('title', event.target.value)} style={inputStyle} />
          </Field>

          <Field label="Merchant">
            <input value={fields.merchant} onChange={(event) => update('merchant', event.target.value)} style={inputStyle} />
          </Field>

          <Field label="Provider / issuer">
            <input value={fields.provider} onChange={(event) => update('provider', event.target.value)} style={inputStyle} />
          </Field>

          <Field label="Benefit type">
            <select value={fields.benefitType} onChange={(event) => update('benefitType', event.target.value)} style={inputStyle}>
              <option value="">Unknown</option>
              <option value="percentage">Percentage discount</option>
              <option value="cashback_fixed">Fixed cashback</option>
              <option value="discount_fixed">Fixed discount</option>
              <option value="points">Points</option>
              <option value="other">Other</option>
            </select>
          </Field>

          <Field label="Benefit value">
            <input type="number" min="0" step="0.01" value={fields.benefitValue} onChange={(event) => update('benefitValue', event.target.value)} style={inputStyle} />
          </Field>

          <Field label="Minimum spend">
            <input type="number" min="0" step="1" value={fields.minimumSpend} onChange={(event) => update('minimumSpend', event.target.value)} style={inputStyle} />
          </Field>

          <Field label="Maximum benefit">
            <input type="number" min="0" step="1" value={fields.maximumBenefit} onChange={(event) => update('maximumBenefit', event.target.value)} style={inputStyle} />
          </Field>

          <Field label="Voucher code">
            <input value={fields.voucherCode} onChange={(event) => update('voucherCode', event.target.value)} style={inputStyle} />
          </Field>

          <Field label="Payment methods">
            <input value={fields.paymentMethods} onChange={(event) => update('paymentMethods', event.target.value)} style={inputStyle} placeholder="BCA credit card, QRIS" />
          </Field>

          <Field label="Start date">
            <input type="date" value={fields.startsAt} onChange={(event) => update('startsAt', event.target.value)} style={inputStyle} />
          </Field>

          <Field label="Expiry date">
            <input type="date" value={fields.expiresAt} onChange={(event) => update('expiresAt', event.target.value)} style={inputStyle} />
          </Field>

          <Field label="Applicable days">
            <input value={fields.applicableDays} onChange={(event) => update('applicableDays', event.target.value)} style={inputStyle} placeholder="Monday, Tuesday" />
          </Field>

          <Field label="Channels">
            <input value={fields.channels} onChange={(event) => update('channels', event.target.value)} style={inputStyle} placeholder="online, offline" />
          </Field>

          <Field label="Eligibility JSON" wide>
            <textarea rows="4" value={fields.eligibility} onChange={(event) => update('eligibility', event.target.value)} style={{...inputStyle, resize: 'vertical'}} />
          </Field>

          <Field label="Terms and conditions" wide>
            <textarea rows="8" value={fields.termsText} onChange={(event) => update('termsText', event.target.value)} style={{...inputStyle, resize: 'vertical'}} />
          </Field>
        </div>
      </section>

      <section style={{borderTop: '1px solid var(--hair)', paddingTop: 18, display: 'grid', gap: 12}}>
        <Field label="Resolution note" wide>
          <input value={note} onChange={(event) => setNote(event.target.value)} style={inputStyle} placeholder="Optional note for audit history" />
        </Field>

        <div style={{display: 'flex', flexWrap: 'wrap', gap: 10}}>
          <button className="btn primary" type="button" onClick={() => resolve('approve')} disabled={state.status === 'running'}>
            Approve and publish
          </button>
          <button className="btn" type="button" onClick={() => resolve('reject')} disabled={state.status === 'running'}>
            Reject promotion
          </button>
        </div>

        <details style={{border: '1px solid var(--hair2)', padding: 12}}>
          <summary style={{cursor: 'pointer', fontWeight: 800}}>Merge as duplicate</summary>
          <div style={{display: 'grid', gap: 10, marginTop: 12}}>
            <select value={targetPromotionId} onChange={(event) => setTargetPromotionId(event.target.value)} style={inputStyle}>
              <option value="">Choose the promotion to keep</option>
              {mergeOptions.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title} — {candidate.merchant || candidate.provider || 'Unknown merchant'} ({candidate.publication_status})
                </option>
              ))}
            </select>
            <div>
              <button className="btn" type="button" onClick={() => resolve('merge')} disabled={state.status === 'running' || !targetPromotionId}>
                Merge duplicate
              </button>
            </div>
          </div>
        </details>

        {state.message ? (
          <div style={{fontSize: 13, color: state.status === 'error' ? 'var(--fg)' : 'var(--muted)'}}>{state.message}</div>
        ) : null}
      </section>
    </article>
  )
}

export default function ReviewQueueClient({initialItems = [], mergeCandidates = []}) {
  const [items, setItems] = useState(initialItems)

  function removeResolved(reviewId) {
    setItems((current) => current.filter((item) => item.id !== reviewId))
  }

  if (!items.length) {
    return (
      <div style={{border: '1px solid var(--hair)', padding: 24, display: 'grid', gap: 10}}>
        <h2>Review queue is clear</h2>
        <p className="lead">There are no pending or in-review promotions right now.</p>
        <div><a className="btn" href="/promo-admin">Back to source monitoring</a></div>
      </div>
    )
  }

  return (
    <div style={{display: 'grid', gap: 18}}>
      {items.map((item) => (
        <ReviewCard
          key={item.id}
          item={item}
          candidates={mergeCandidates}
          onResolved={removeResolved}
        />
      ))}
    </div>
  )
}
