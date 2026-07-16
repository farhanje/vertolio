export const PUBLIC_PROMO_CATEGORIES = {
  food_dining: 'Food & dining',
  groceries: 'Groceries',
  travel: 'Travel',
  transportation: 'Transportation',
  shopping: 'Shopping',
  fashion: 'Fashion',
  electronics: 'Electronics',
  entertainment: 'Entertainment',
  health_beauty: 'Health & beauty',
  bills_utilities: 'Bills & utilities',
  financial_services: 'Financial services',
  education: 'Education',
  home_living: 'Home & living',
  automotive: 'Automotive',
  other: 'Other',
}

export function slugifyPromo(value) {
  return String(value || 'promo')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'promo'
}

export function publicPromoSlug(promotion) {
  return `${slugifyPromo(promotion?.merchant || promotion?.title)}--${promotion?.id}`
}

export function promotionIdFromSlug(value) {
  const match = String(value || '').match(/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i)
  return match?.[1] || null
}

export function categoryLabel(value) {
  return PUBLIC_PROMO_CATEGORIES[value] || PUBLIC_PROMO_CATEGORIES.other
}

export function sourceNameForPromotion(source, promotion) {
  return source?.name || promotion?.provider || 'Official source'
}

export function publicPromotionKind(promotion) {
  return promotion?.verification_status === 'catalog_listing'
    || promotion?.publishability_status === 'catalog_listing'
    ? 'catalog'
    : 'promo'
}

export function preparePublicPromotion(promotion, source = null) {
  return {
    id: promotion.id,
    slug: publicPromoSlug(promotion),
    kind: publicPromotionKind(promotion),
    title: promotion.title || '',
    merchant: promotion.merchant || promotion.title || 'Merchant',
    offerSummary: promotion.offer_summary || promotion.title || '',
    requirementsSummary: promotion.requirements_summary || promotion.eligibility_summary || '',
    paymentMethods: promotion.payment_methods || [],
    minimumSpend: promotion.minimum_spend,
    benefitType: promotion.benefit_type,
    benefitValue: promotion.benefit_value,
    maximumBenefit: promotion.maximum_benefit,
    voucherCode: promotion.voucher_code || '',
    startsAt: promotion.starts_at,
    expiresAt: promotion.expires_at,
    applicableDays: promotion.applicable_days || [],
    channels: promotion.channels || [],
    primaryCategory: promotion.primary_category || 'other',
    categories: promotion.categories?.length ? promotion.categories : [promotion.primary_category || 'other'],
    tags: promotion.tags || [],
    locationScope: promotion.location_scope || 'unknown',
    cities: promotion.cities || [],
    provinces: promotion.provinces || [],
    outletCount: Number(promotion.outlet_count || 0),
    status: promotion.status || 'active',
    sourceUrl: promotion.source_url || promotion.canonical_url || '',
    sourceName: sourceNameForPromotion(source, promotion),
    sourceAdapter: source?.adapter_key || '',
    quotaText: promotion.quota_text || '',
    publishedAt: promotion.published_at,
    lastVerifiedAt: promotion.last_verified_at,
  }
}
