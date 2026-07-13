const MATERIAL_FIELDS = [
  'title',
  'merchant',
  'provider',
  'minimumSpend',
  'benefitType',
  'benefitValue',
  'maximumBenefit',
  'startsAt',
  'expiresAt',
  'paymentMethods',
  'voucherCode',
  'applicableDays',
  'eligibility',
  'eligibilitySummary',
  'quotaText',
  'channels',
  'primaryCategory',
  'categories',
  'tags',
  'locationScope',
  'cities',
  'provinces',
  'outlets',
]

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value
      .map(canonicalize)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalize(item)]),
    )
  }
  return value ?? null
}

function stable(value) {
  return JSON.stringify(canonicalize(value))
}

export function detectMaterialChanges(previous, next) {
  const changes = []

  for (const field of MATERIAL_FIELDS) {
    const before = previous?.[field] ?? null
    const after = next?.[field] ?? null
    if (stable(before) === stable(after)) continue
    changes.push({field, before, after})
  }

  return changes
}
