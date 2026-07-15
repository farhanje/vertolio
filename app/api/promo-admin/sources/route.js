import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase.server'
import { hasPromotionSourceAdapter, listPromotionSourceAdapters } from '@/lib/promo-sources/registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FREQUENCIES = {
  every_hour: 60,
  every_3_hours: 180,
  every_6_hours: 360,
  every_12_hours: 720,
  daily: 1440,
  weekly: 10080,
}

const STARTER_SOURCES = [
  {
    name: 'BCA Promotions',
    base_url: 'https://promo.bca.co.id/id/all',
    adapter_key: 'bca',
    check_frequency: 'every_6_hours',
    check_interval_minutes: 360,
    minimum_confidence: 0.85,
    max_pages_per_run: 25,
    auto_publish_enabled: true,
    adapter_config: {page_batch_size: 1},
  },
  {
    name: 'Ultra Voucher Catalog',
    base_url: 'https://ultravoucher.co.id/',
    adapter_key: 'ultra-voucher',
    check_frequency: 'every_6_hours',
    check_interval_minutes: 360,
    minimum_confidence: 0.85,
    max_pages_per_run: 25,
    auto_publish_enabled: true,
    adapter_config: {page_batch_size: 1},
  },
]

function normalizePublicUrl(input) {
  const url = new URL(String(input || '').trim())
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only public HTTP or HTTPS URLs are allowed')
  if (url.username || url.password) throw new Error('URLs with embedded credentials are not allowed')

  const hostname = url.hostname.toLowerCase()
  if (
    hostname === 'localhost'
    || hostname.endsWith('.local')
    || hostname === '0.0.0.0'
    || hostname === '::1'
    || /^127\./.test(hostname)
    || /^10\./.test(hostname)
    || /^192\.168\./.test(hostname)
    || /^169\.254\./.test(hostname)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    throw new Error('Private or local network sources are not allowed')
  }

  url.hash = ''
  return url.toString()
}

function stringList(value, maxItems = 20) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item || '').trim().slice(0, 160))
    .filter(Boolean)
    .slice(0, maxItems)
}

function normalizeBoundaryConfig(value) {
  if (!value || typeof value !== 'object') return null
  const config = {
    start_markers: stringList(value.startMarkers || value.start_markers),
    end_markers: stringList(value.endMarkers || value.end_markers),
    exclude_lines: stringList(value.excludeLines || value.exclude_lines, 40),
    start_occurrence: value.startOccurrence === 'last' || value.start_occurrence === 'last' ? 'last' : 'first',
    require_start: Boolean(value.requireStart ?? value.require_start),
    require_end: Boolean(value.requireEnd ?? value.require_end),
    max_chars: Math.max(500, Math.min(Number(value.maxChars || value.max_chars || 30000), 100000)),
  }
  return config.start_markers.length || config.end_markers.length || config.exclude_lines.length
    ? config
    : null
}

async function createSourceIfMissing(sb, source) {
  const existing = await sb
    .from('promo_sources')
    .select('*')
    .eq('base_url', source.base_url)
    .maybeSingle()
  if (existing.error) throw existing.error

  if (existing.data) {
    const previousConfig = existing.data.adapter_config && typeof existing.data.adapter_config === 'object'
      ? existing.data.adapter_config
      : {}
    const updated = await sb
      .from('promo_sources')
      .update({
        name: source.name,
        adapter_key: source.adapter_key,
        check_frequency: source.check_frequency,
        check_interval_minutes: source.check_interval_minutes,
        max_pages_per_run: source.max_pages_per_run,
        auto_publish_enabled: Boolean(source.auto_publish_enabled),
        minimum_confidence: source.minimum_confidence,
        adapter_config: {...previousConfig, ...(source.adapter_config || {})},
        enabled: true,
        status: 'healthy',
        next_run_at: new Date().toISOString(),
      })
      .eq('id', existing.data.id)
      .select('*')
      .single()
    if (updated.error) throw updated.error
    return {source: updated.data, created: false, updated: true}
  }

  const result = await sb
    .from('promo_sources')
    .insert({
      ...source,
      source_type: 'official_web',
      timezone: 'Asia/Jakarta',
      enabled: true,
      auto_publish_enabled: Boolean(source.auto_publish_enabled),
      status: 'healthy',
      next_run_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (result.error) throw result.error
  return {source: result.data, created: true, updated: false}
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const sb = supabaseServer()

    if (body.preset === 'starter') {
      const results = []
      for (const source of STARTER_SOURCES) {
        results.push(await createSourceIfMissing(sb, source))
      }
      return NextResponse.json({ok: true, results})
    }

    const name = String(body.name || '').trim()
    const baseUrl = normalizePublicUrl(body.baseUrl)
    const adapterKey = String(body.adapterKey || 'generic-html').trim()
    const frequency = String(body.frequency || 'every_6_hours').trim()
    const confidence = Number(body.minimumConfidence || 0.85)
    const boundaryConfig = normalizeBoundaryConfig(body.boundaries)

    if (!name || name.length > 120) throw new Error('Source name is required and must be under 120 characters')
    if (!hasPromotionSourceAdapter(adapterKey)) throw new Error('Unknown source adapter')
    if (!FREQUENCIES[frequency]) throw new Error('Unsupported check frequency')
    if (!Number.isFinite(confidence) || confidence < 0.5 || confidence > 1) {
      throw new Error('Confidence threshold must be between 0.5 and 1')
    }

    // Dedicated adapters have tested boundaries and may publish automatically.
    // A new generic source is collected and evaluated automatically but remains
    // review-only until a boundary contract or dedicated adapter is shipped.
    const dedicatedAdapter = adapterKey !== 'generic-html'
    const adapterConfig = {page_batch_size: 1}
    if (boundaryConfig) adapterConfig.boundaries = boundaryConfig

    const result = await createSourceIfMissing(sb, {
      name,
      base_url: baseUrl,
      adapter_key: adapterKey,
      check_frequency: frequency,
      check_interval_minutes: FREQUENCIES[frequency],
      minimum_confidence: confidence,
      max_pages_per_run: Math.max(1, Math.min(Number(body.maxPagesPerRun || 25), 100)),
      auto_publish_enabled: dedicatedAdapter && Boolean(body.autoPublishEnabled ?? true),
      adapter_config: adapterConfig,
    })

    return NextResponse.json({
      ok: true,
      ...result,
      autoPublishEnabled: result.source.auto_publish_enabled,
      safetyMode: result.source.auto_publish_enabled ? 'tested_adapter' : 'generic_review_only',
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'Could not add promotion source',
      detail: String(error?.message || error),
      adapters: listPromotionSourceAdapters(),
    }, {status: 400})
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const sourceId = String(body.sourceId || '').trim()
    const action = String(body.action || '').trim()
    if (!sourceId) throw new Error('sourceId is required')
    if (!['pause', 'resume'].includes(action)) throw new Error('action must be pause or resume')

    const sb = supabaseServer()
    const update = action === 'pause'
      ? {enabled: false, status: 'paused', locked_until: null}
      : {enabled: true, status: 'healthy', next_run_at: new Date().toISOString(), locked_until: null}

    const result = await sb
      .from('promo_sources')
      .update(update)
      .eq('id', sourceId)
      .select('*')
      .single()

    if (result.error) throw result.error
    return NextResponse.json({ok: true, source: result.data})
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'Could not update promotion source',
      detail: String(error?.message || error),
    }, {status: 400})
  }
}
