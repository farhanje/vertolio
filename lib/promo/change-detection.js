const MATERIAL_FIELDS = [
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
  'channels',
]

function stable(value) {
  if (Array.isArray(value)) return JSON.stringify([...value].sort())
  if (value && typeof value === 'object') {
    return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))))
  }
  return value ?? null
}

export function detectMaterialChanges(previous, next) {
  const changes = []

  for (const field of MATERIAL_FIELDS) {
    const before = previous?.[field] ?? null
    const after = next?.[field] ?? null
    if (stable(before) === stable(after)) continue
    changes.push({ field, before, after })
  }

  return changes
}
