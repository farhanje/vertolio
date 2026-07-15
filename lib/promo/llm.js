const DEFAULT_PROVIDER = 'gemini'
const DEFAULT_MODEL = 'gemini-3.1-flash-lite'
const DEFAULT_MONTHLY_BUDGET_USD = 5
const DEFAULT_DAILY_CALL_LIMIT = 500
const DEFAULT_MAX_OUTPUT_TOKENS = 4096
const FULL_EXTRACTION_MIN_OUTPUT_TOKENS = 4096
const MAX_OUTPUT_TOKENS = 8192

export const PROMO_LLM_PROMPT_VERSION = 'full-promo-extraction-v5-compact-output'
export const PROMO_LLM_TAXONOMY_VERSION = 'promo-taxonomy-v1'

const GEMINI_PAID_PRICING_PER_MILLION = {
  input: 0.25,
  output: 1.5,
}

function numberFromEnv(name, fallback, {min = 0, max = Number.MAX_SAFE_INTEGER} = {}) {
  const parsed = Number(process.env[name])
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(parsed, max))
}

function normalizeMode(value) {
  const mode = String(value || 'new_changed').trim().toLowerCase()
  return ['new_changed', 'ambiguous_only', 'rules_only'].includes(mode) ? mode : 'new_changed'
}

export function getPromoLlmConfig() {
  const provider = String(process.env.PROMO_LLM_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase()
  const model = String(process.env.PROMO_LLM_MODEL || DEFAULT_MODEL).trim()
  const mode = normalizeMode(process.env.PROMO_LLM_MODE)
  const apiKeyConfigured = provider === 'gemini' && Boolean(process.env.GEMINI_API_KEY)

  return {
    provider,
    model,
    mode,
    apiKeyConfigured,
    enabled: provider === 'gemini' && apiKeyConfigured && mode !== 'rules_only',
    monthlyBudgetUsd: numberFromEnv('PROMO_LLM_MONTHLY_BUDGET_USD', DEFAULT_MONTHLY_BUDGET_USD, {min: 0, max: DEFAULT_MONTHLY_BUDGET_USD}),
    dailyCallLimit: Math.floor(numberFromEnv('PROMO_LLM_DAILY_CALL_LIMIT', DEFAULT_DAILY_CALL_LIMIT, {min: 1, max: 100000})),
    maxOutputTokens: Math.floor(numberFromEnv('PROMO_LLM_MAX_OUTPUT_TOKENS', DEFAULT_MAX_OUTPUT_TOKENS, {min: 100, max: MAX_OUTPUT_TOKENS})),
    promptVersion: PROMO_LLM_PROMPT_VERSION,
    taxonomyVersion: PROMO_LLM_TAXONOMY_VERSION,
  }
}

function resolveOutputLimit(operation, requested, config) {
  const requestedLimit = Number.isFinite(Number(requested)) && Number(requested) > 0
    ? Math.floor(Number(requested))
    : config.maxOutputTokens

  if (operation === 'full_promo_extraction') {
    return Math.min(
      Math.max(requestedLimit, config.maxOutputTokens, FULL_EXTRACTION_MIN_OUTPUT_TOKENS),
      MAX_OUTPUT_TOKENS,
    )
  }

  return Math.min(requestedLimit, config.maxOutputTokens, MAX_OUTPUT_TOKENS)
}

function paidEquivalentCost(inputTokens, outputTokens) {
  const input = Math.max(0, Number(inputTokens || 0))
  const output = Math.max(0, Number(outputTokens || 0))
  return (input * GEMINI_PAID_PRICING_PER_MILLION.input + output * GEMINI_PAID_PRICING_PER_MILLION.output) / 1_000_000
}

function estimateTokens(text) {
  return Math.max(1, Math.ceil(String(text || '').length / 4))
}

function extractGenerateContentText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || []
  const text = parts
    .map((part) => typeof part?.text === 'string' ? part.text : '')
    .filter(Boolean)
    .join('')
    .trim()
  return text || null
}

function parseJsonOutput(text) {
  const cleaned = String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch (firstError) {
    const objectStart = cleaned.indexOf('{')
    const objectEnd = cleaned.lastIndexOf('}')
    const arrayStart = cleaned.indexOf('[')
    const arrayEnd = cleaned.lastIndexOf(']')

    const objectCandidate = objectStart >= 0 && objectEnd > objectStart
      ? cleaned.slice(objectStart, objectEnd + 1)
      : null
    const arrayCandidate = arrayStart >= 0 && arrayEnd > arrayStart
      ? cleaned.slice(arrayStart, arrayEnd + 1)
      : null

    for (const candidate of [objectCandidate, arrayCandidate]) {
      if (!candidate) continue
      try {
        return JSON.parse(candidate)
      } catch (_) {
        // Try the next candidate before returning the original parse error.
      }
    }

    throw new Error(`Gemini returned invalid JSON: ${firstError.message}`)
  }
}

function geminiErrorDetail(data, status) {
  const base = data?.error?.message || data?.message || `Gemini returned HTTP ${status}`
  const violations = (data?.error?.details || [])
    .flatMap((detail) => detail?.fieldViolations || detail?.field_violations || [])
    .map((violation) => {
      const field = violation?.field ? `${violation.field}: ` : ''
      return `${field}${violation?.description || violation?.message || ''}`.trim()
    })
    .filter(Boolean)

  if (violations.length) return `${base} | ${violations.join(' | ')}`

  const rawDetails = data?.error?.details
  if (rawDetails?.length) {
    const serialized = JSON.stringify(rawDetails)
    return `${base} | ${serialized.slice(0, 1200)}`
  }

  return base
}

function monthStartJakarta(now = new Date()) {
  const shifted = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) - 7 * 60 * 60 * 1000).toISOString()
}

async function safeInsertUsage(sb, payload) {
  if (!sb) return
  try {
    await sb.from('promo_llm_usage').insert(payload)
  } catch (_) {
    // Usage telemetry must never break deterministic promo ingestion.
  }
}

async function readCache(sb, config, contentHash) {
  if (!sb || !contentHash) return null
  const result = await sb
    .from('promo_llm_cache')
    .select('result,input_tokens,output_tokens,estimated_cost_usd,response_id,service_tier')
    .eq('provider', config.provider)
    .eq('model', config.model)
    .eq('content_hash', contentHash)
    .eq('prompt_version', config.promptVersion)
    .eq('taxonomy_version', config.taxonomyVersion)
    .maybeSingle()

  if (result.error) return null
  return result.data || null
}

async function writeCache(sb, config, contentHash, response) {
  if (!sb || !contentHash || !response?.result) return
  await sb.from('promo_llm_cache').upsert({
    provider: config.provider,
    model: config.model,
    content_hash: contentHash,
    prompt_version: config.promptVersion,
    taxonomy_version: config.taxonomyVersion,
    result: response.result,
    input_tokens: response.inputTokens,
    output_tokens: response.outputTokens,
    estimated_cost_usd: response.estimatedCostUsd,
    response_id: response.responseId,
    service_tier: response.serviceTier,
  }, {
    onConflict: 'provider,model,content_hash,prompt_version,taxonomy_version',
  })
}

async function reserveBudget(sb, config, request) {
  const inputText = JSON.stringify({
    systemInstruction: request.systemInstruction,
    input: request.input,
    schema: request.schema,
  })
  const estimatedInputTokens = estimateTokens(inputText)
  const maxEstimatedCostUsd = paidEquivalentCost(estimatedInputTokens, request.maxOutputTokens)

  const reservation = await sb.rpc('reserve_promo_llm_request', {
    p_provider: config.provider,
    p_model: config.model,
    p_operation: request.operation || 'segmentation',
    p_content_hash: request.contentHash || null,
    p_prompt_version: config.promptVersion,
    p_taxonomy_version: config.taxonomyVersion,
    p_source_id: request.source?.id || null,
    p_job_id: request.job?.id || null,
    p_promotion_id: request.promotionId || null,
    p_max_estimated_cost_usd: maxEstimatedCostUsd,
    p_monthly_budget_usd: config.monthlyBudgetUsd,
    p_daily_call_limit: config.dailyCallLimit,
    p_metadata: {
      canonicalUrl: request.canonicalUrl || null,
      estimatedInputTokens,
      maxOutputTokens: request.maxOutputTokens,
      api: 'generateContent-json-mode',
    },
  })

  if (reservation.error) {
    return {
      allowed: false,
      status: 'failed',
      error: `LLM budget migration is missing or unavailable: ${reservation.error.message}`,
    }
  }

  return reservation.data || {allowed: false, status: 'failed', error: 'Budget reservation returned no result'}
}

async function finalizeReservation(sb, usageId, update) {
  if (!sb || !usageId) return
  await sb.from('promo_llm_usage').update(update).eq('id', usageId)
}

function buildPromptInput(request) {
  if (!request.schema) return request.input
  return [
    request.input,
    '',
    'Return one compact JSON value that follows this schema semantically. The application validates every field after generation.',
    'Keep summaries and evidence quotes concise. Never repeat the same evidence. Do not include markdown fences or explanatory text.',
    JSON.stringify(request.schema),
  ].join('\n')
}

async function callGemini(config, request) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45000)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-goog-api-key': process.env.GEMINI_API_KEY,
        'content-type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{text: buildPromptInput(request)}],
        }],
        systemInstruction: {
          parts: [{text: request.systemInstruction}],
        },
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: request.maxOutputTokens,
          temperature: 0,
        },
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(geminiErrorDetail(data, response.status))

    const candidate = data?.candidates?.[0] || {}
    const finishReason = candidate.finishReason || null
    const text = extractGenerateContentText(data)
    if (!text) {
      const blockReason = data?.promptFeedback?.blockReason
      throw new Error(`Gemini returned no JSON output${blockReason ? `; prompt=${blockReason}` : ''}${finishReason ? `; finish=${finishReason}` : ''}`)
    }

    const usage = data.usageMetadata || {}
    const inputTokens = Number(usage.promptTokenCount || 0)
    const candidateTokens = Number(usage.candidatesTokenCount || 0)
    const outputTokens = candidateTokens + Number(usage.thoughtsTokenCount || 0)

    let result
    try {
      result = parseJsonOutput(text)
    } catch (error) {
      if (finishReason === 'MAX_TOKENS') {
        throw new Error(`Gemini output was truncated at ${candidateTokens || request.maxOutputTokens} output token(s); finishReason=MAX_TOKENS; increase or compact the extraction response`)
      }
      throw error
    }

    return {
      result,
      inputTokens,
      outputTokens,
      estimatedCostUsd: paidEquivalentCost(inputTokens, outputTokens),
      responseId: data.responseId || null,
      serviceTier: usage.serviceTier || null,
      modelVersion: data.modelVersion || config.model,
      finishReason,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function runPromoLlmStructured({
  sb,
  source,
  job,
  promotionId = null,
  contentHash,
  canonicalUrl,
  operation = 'segmentation',
  input,
  schema,
  systemInstruction,
  maxOutputTokens,
  bypassCache = false,
}) {
  const config = getPromoLlmConfig()
  const outputLimit = resolveOutputLimit(operation, maxOutputTokens, config)

  if (!config.enabled) {
    return {
      result: null,
      status: config.mode === 'rules_only' ? 'rules_only' : 'disabled',
      provider: config.provider,
      model: config.model,
      error: config.apiKeyConfigured ? null : 'GEMINI_API_KEY is not configured',
    }
  }

  if (!bypassCache) {
    const cached = await readCache(sb, config, contentHash)
    if (cached) {
      await safeInsertUsage(sb, {
        provider: config.provider,
        model: config.model,
        operation,
        status: 'cached',
        source_id: source?.id || null,
        job_id: job?.id || null,
        promotion_id: promotionId,
        canonical_url: canonicalUrl || null,
        content_hash: contentHash || null,
        prompt_version: config.promptVersion,
        taxonomy_version: config.taxonomyVersion,
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost_usd: 0,
        response_id: cached.response_id,
        service_tier: cached.service_tier,
      })

      return {
        result: cached.result,
        status: 'cached',
        provider: config.provider,
        model: config.model,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUsd: 0,
        responseId: cached.response_id,
      }
    }
  }

  const reservation = await reserveBudget(sb, config, {
    source,
    job,
    promotionId,
    contentHash,
    canonicalUrl,
    operation,
    input,
    schema,
    systemInstruction,
    maxOutputTokens: outputLimit,
  })

  if (!reservation.allowed) {
    return {
      result: null,
      status: reservation.status || 'skipped_budget',
      provider: config.provider,
      model: config.model,
      error: reservation.error || null,
      budget: reservation,
    }
  }

  try {
    const response = await callGemini(config, {
      input,
      schema,
      systemInstruction,
      maxOutputTokens: outputLimit,
    })

    await finalizeReservation(sb, reservation.usageId, {
      status: 'success',
      input_tokens: response.inputTokens,
      output_tokens: response.outputTokens,
      estimated_cost_usd: response.estimatedCostUsd,
      response_id: response.responseId,
      service_tier: response.serviceTier,
      metadata: {
        ...(reservation.metadata || {}),
        modelVersion: response.modelVersion,
        finishReason: response.finishReason,
        maxOutputTokens: outputLimit,
        api: 'generateContent-json-mode',
      },
    })
    await writeCache(sb, config, contentHash, response)

    return {
      ...response,
      status: 'success',
      provider: config.provider,
      model: config.model,
    }
  } catch (error) {
    await finalizeReservation(sb, reservation.usageId, {
      status: 'failed',
      estimated_cost_usd: Number(reservation.reservedCostUsd || 0),
      error_message: String(error?.message || error),
      metadata: {
        ...(reservation.metadata || {}),
        maxOutputTokens: outputLimit,
        api: 'generateContent-json-mode',
      },
    })

    return {
      result: null,
      status: 'failed',
      provider: config.provider,
      model: config.model,
      error: String(error?.message || error),
    }
  }
}

export async function getPromoLlmUsageSummary(sb, now = new Date()) {
  const config = getPromoLlmConfig()
  const usageResult = await sb
    .from('promo_llm_usage')
    .select('status,reserved_cost_usd,estimated_cost_usd,input_tokens,output_tokens,created_at')
    .gte('created_at', monthStartJakarta(now))

  if (usageResult.error) {
    return {
      available: false,
      config,
      error: usageResult.error.message,
      calls: 0,
      cacheHits: 0,
      failures: 0,
      budgetSkips: 0,
      estimatedCostUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
    }
  }

  const rows = usageResult.data || []
  return rows.reduce((summary, row) => {
    if (row.status === 'success') summary.calls += 1
    if (row.status === 'cached') summary.cacheHits += 1
    if (row.status === 'failed') summary.failures += 1
    if (['skipped_budget', 'skipped_daily_limit'].includes(row.status)) summary.budgetSkips += 1
    if (['success', 'failed'].includes(row.status)) {
      summary.estimatedCostUsd += Number(row.estimated_cost_usd || 0)
    }
    if (row.status === 'reserved' && Date.now() - new Date(row.created_at).getTime() < 60 * 60 * 1000) {
      summary.estimatedCostUsd += Number(row.reserved_cost_usd || 0)
    }
    summary.inputTokens += Number(row.input_tokens || 0)
    summary.outputTokens += Number(row.output_tokens || 0)
    return summary
  }, {
    available: true,
    config,
    calls: 0,
    cacheHits: 0,
    failures: 0,
    budgetSkips: 0,
    estimatedCostUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
  })
}

export async function testPromoLlmConnection(sb) {
  const contentHash = `health-test-${Date.now()}`
  const result = await runPromoLlmStructured({
    sb,
    contentHash,
    canonicalUrl: 'internal://promo-llm-health-test',
    operation: 'health_test',
    bypassCache: true,
    maxOutputTokens: 120,
    systemInstruction: 'Return only the requested JSON classification. Do not add facts that are not in the input.',
    input: 'Classify this public promo: Diskon 20% untuk makan di restoran Jakarta. Berlaku online dan offline.',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['category', 'city', 'confidence'],
      properties: {
        category: {type: 'string', enum: ['food_dining', 'other']},
        city: {type: 'string'},
        confidence: {type: 'number', minimum: 0, maximum: 1},
      },
    },
  })

  return {
    ok: ['success', 'cached'].includes(result.status),
    ...result,
  }
}
