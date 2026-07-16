import {cache} from 'react'
import {supabaseServer} from '../supabase.server'
import {preparePublicPromotion} from './public-view'

const FEED_COLUMNS = [
  'id',
  'source_id',
  'canonical_url',
  'source_url',
  'title',
  'merchant',
  'provider',
  'offer_summary',
  'requirements_summary',
  'payment_methods',
  'minimum_spend',
  'benefit_type',
  'benefit_value',
  'maximum_benefit',
  'voucher_code',
  'starts_at',
  'expires_at',
  'applicable_days',
  'channels',
  'primary_category',
  'categories',
  'tags',
  'location_scope',
  'cities',
  'provinces',
  'outlet_count',
  'status',
  'publication_status',
  'verification_status',
  'publishability_status',
  'quota_text',
  'eligibility_summary',
  'source_trust_level',
  'duplicate_of',
  'is_promotion',
  'published_at',
  'last_verified_at',
].join(',')

const DETAIL_COLUMNS = `${FEED_COLUMNS},eligibility,terms_text,calculated_values`
const PUBLIC_STATUSES = ['active', 'expiring_soon', 'upcoming']
const TRUSTED_SOURCE_LEVELS = ['official_source', 'trusted_aggregator']

function assertQuery(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data || []
}

async function sourceMapFor(sb, rows) {
  const ids = [...new Set((rows || []).map((row) => row.source_id).filter(Boolean))]
  if (!ids.length) return new Map()

  const result = await sb
    .from('promo_sources')
    .select('id,name,adapter_key,source_type')
    .in('id', ids)

  const sources = assertQuery(result, 'Could not read promo sources')
  return new Map(sources.map((source) => [source.id, source]))
}

function isPublicVerified(row) {
  return row?.is_promotion !== false
    && !row?.duplicate_of
    && row?.publication_status === 'published'
    && row?.verification_status === 'verified'
    && row?.publishability_status === 'publishable'
    && PUBLIC_STATUSES.includes(row?.status)
    && TRUSTED_SOURCE_LEVELS.includes(row?.source_trust_level)
}

function isPublicCatalog(row) {
  return row?.is_promotion !== false
    && !row?.duplicate_of
    && row?.verification_status === 'catalog_listing'
    && row?.publishability_status === 'catalog_listing'
    && TRUSTED_SOURCE_LEVELS.includes(row?.source_trust_level)
}

function comparePublicPromos(left, right) {
  const leftCatalog = left.kind === 'catalog'
  const rightCatalog = right.kind === 'catalog'
  if (leftCatalog !== rightCatalog) return leftCatalog ? 1 : -1

  if (!leftCatalog) {
    const leftUpcoming = left.status === 'upcoming'
    const rightUpcoming = right.status === 'upcoming'
    if (leftUpcoming !== rightUpcoming) return leftUpcoming ? 1 : -1

    const leftDate = new Date(left.expiresAt || left.startsAt || '9999-12-31').getTime()
    const rightDate = new Date(right.expiresAt || right.startsAt || '9999-12-31').getTime()
    if (leftDate !== rightDate) return leftDate - rightDate
  }

  return String(left.merchant || left.title).localeCompare(String(right.merchant || right.title), 'id')
}

export const getPublicPromotions = cache(async function getPublicPromotions() {
  const sb = supabaseServer()
  const [verifiedResult, catalogResult] = await Promise.all([
    sb
      .from('promotions')
      .select(FEED_COLUMNS)
      .eq('is_promotion', true)
      .is('duplicate_of', null)
      .eq('publication_status', 'published')
      .eq('verification_status', 'verified')
      .eq('publishability_status', 'publishable')
      .in('status', PUBLIC_STATUSES)
      .in('source_trust_level', TRUSTED_SOURCE_LEVELS),
    sb
      .from('promotions')
      .select(FEED_COLUMNS)
      .eq('is_promotion', true)
      .is('duplicate_of', null)
      .eq('verification_status', 'catalog_listing')
      .eq('publishability_status', 'catalog_listing')
      .in('source_trust_level', TRUSTED_SOURCE_LEVELS),
  ])

  const verified = assertQuery(verifiedResult, 'Could not read verified promotions')
  const catalog = assertQuery(catalogResult, 'Could not read catalog promotions')
  const rows = [...verified.filter(isPublicVerified), ...catalog.filter(isPublicCatalog)]
  const sources = await sourceMapFor(sb, rows)

  return rows
    .map((row) => preparePublicPromotion(row, sources.get(row.source_id)))
    .sort(comparePublicPromos)
})

export const getPublicPromotionById = cache(async function getPublicPromotionById(id) {
  if (!id) return null
  const sb = supabaseServer()
  const promotionResult = await sb
    .from('promotions')
    .select(DETAIL_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (promotionResult.error) throw new Error(`Could not read promotion: ${promotionResult.error.message}`)
  const row = promotionResult.data
  if (!row || (!isPublicVerified(row) && !isPublicCatalog(row))) return null

  const [sourceResult, outletsResult] = await Promise.all([
    row.source_id
      ? sb.from('promo_sources').select('id,name,adapter_key,source_type').eq('id', row.source_id).maybeSingle()
      : Promise.resolve({data: null, error: null}),
    sb
      .from('promo_outlets')
      .select('id,outlet_name,address,city,province,postal_code,source_text')
      .eq('promotion_id', row.id)
      .order('outlet_name'),
  ])

  if (sourceResult.error) throw new Error(`Could not read promotion source: ${sourceResult.error.message}`)
  if (outletsResult.error) throw new Error(`Could not read promotion outlets: ${outletsResult.error.message}`)

  const prepared = preparePublicPromotion(row, sourceResult.data)
  return {
    ...prepared,
    eligibility: row.eligibility || {},
    eligibilitySummary: row.eligibility_summary || '',
    termsText: row.terms_text || '',
    calculatedValues: row.calculated_values || {},
    outlets: (outletsResult.data || []).map((outlet) => ({
      id: outlet.id,
      name: outlet.outlet_name,
      address: outlet.address,
      city: outlet.city,
      province: outlet.province,
      postalCode: outlet.postal_code,
      sourceText: outlet.source_text,
    })),
  }
})
