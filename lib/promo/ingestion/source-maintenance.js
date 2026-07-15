import {BCA_SOURCE_MAPPER_VERSION} from '../../promo-sources/bca-source-mapper'
import {PROMO_DATE_PARSER_VERSION} from '../../promo-sources/date-parser'

const MAX_LEGACY_REVALIDATION = 100
const ULTRA_SNAPSHOT_HARD_CAP = 200

function mappingVersion(promotion) {
  return promotion?.boundary_diagnostics?.sourceMapping?.sourceMappingVersion
    || promotion?.boundary_diagnostics?.sourceMapping?.mapperVersion
    || null
}

function dateParserVersion(promotion) {
  return promotion?.boundary_diagnostics?.dateParsing?.parserVersion || null
}

function needsBcaRevalidation(promotion) {
  return promotion.boundary_status === 'unknown'
    || mappingVersion(promotion) !== BCA_SOURCE_MAPPER_VERSION
    || dateParserVersion(promotion) !== PROMO_DATE_PARSER_VERSION
}

export async function augmentDiscoveryWithLegacyRows(sb, source, discovered = []) {
  if (source.adapter_key !== 'bca') return discovered

  const result = await sb
    .from('promotions')
    .select('id,canonical_url,source_url,title,boundary_status,boundary_diagnostics')
    .eq('source_id', source.id)
    .order('updated_at', {ascending: true})
    .limit(MAX_LEGACY_REVALIDATION)
  if (result.error) throw result.error

  const legacy = (result.data || [])
    .filter(needsBcaRevalidation)
    .map((promotion) => ({
      url: promotion.canonical_url,
      canonicalUrl: promotion.canonical_url,
      sourceUrl: promotion.source_url || promotion.canonical_url,
      title: promotion.title,
      existingPromotionId: promotion.id,
      maintenanceReason: 'legacy_source_mapping_revalidation',
    }))

  const unique = new Map()
  for (const item of [...legacy, ...discovered]) {
    const url = String(item?.canonicalUrl || item?.url || '')
    if (url && !unique.has(url)) unique.set(url, item)
  }
  return [...unique.values()]
}

export async function clearPendingReviewForCanonical(sb, sourceId, canonicalUrl) {
  const promotion = await sb
    .from('promotions')
    .select('id')
    .eq('source_id', sourceId)
    .eq('canonical_url', canonicalUrl)
    .maybeSingle()
  if (promotion.error) throw promotion.error
  if (!promotion.data?.id) return 0

  const deleted = await sb
    .from('promo_review_queue')
    .delete()
    .eq('promotion_id', promotion.data.id)
    .eq('status', 'pending')
    .select('id')
  if (deleted.error) throw deleted.error
  return deleted.data?.length || 0
}

export async function deleteLegacyPromotionAfterGone(sb, item, error) {
  if (!item?.existingPromotionId || !/HTTP\s+(404|410)\b/i.test(String(error?.message || error))) return false
  const reviews = await sb.from('promo_review_queue').delete().eq('promotion_id', item.existingPromotionId)
  if (reviews.error) throw reviews.error
  const deleted = await sb.from('promotions').delete().eq('id', item.existingPromotionId)
  if (deleted.error) throw deleted.error
  return true
}

export async function reconcileAuthoritativeSnapshot(sb, source, discovered = []) {
  if (source.adapter_key !== 'ultra-voucher') return 0
  if (!discovered.length || discovered.length >= ULTRA_SNAPSHOT_HARD_CAP) return 0

  const canonicalUrls = new Set(discovered.map((item) => String(item?.canonicalUrl || item?.url || '')).filter(Boolean))
  const existing = await sb
    .from('promotions')
    .select('id,canonical_url')
    .eq('source_id', source.id)
  if (existing.error) throw existing.error

  const missing = (existing.data || []).filter((promotion) => !canonicalUrls.has(promotion.canonical_url))
  for (const promotion of missing) {
    const reviews = await sb.from('promo_review_queue').delete().eq('promotion_id', promotion.id)
    if (reviews.error) throw reviews.error
    const deleted = await sb.from('promotions').delete().eq('id', promotion.id)
    if (deleted.error) throw deleted.error
  }
  return missing.length
}
