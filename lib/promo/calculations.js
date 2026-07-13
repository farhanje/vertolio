function asNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function calculatePromotionValue(fields, now = new Date()) {
  const minimumSpend = asNumber(fields.minimumSpend)
  const benefitValue = asNumber(fields.benefitValue)
  const maximumBenefit = asNumber(fields.maximumBenefit)
  const type = fields.benefitType

  let benefitAtMinimum = null
  let transactionToMaximize = minimumSpend
  let effectiveDiscountAtMinimum = null

  if (minimumSpend !== null && benefitValue !== null && minimumSpend > 0) {
    if (type === 'percentage') {
      benefitAtMinimum = minimumSpend * (benefitValue / 100)
      if (maximumBenefit !== null) benefitAtMinimum = Math.min(benefitAtMinimum, maximumBenefit)
      effectiveDiscountAtMinimum = (benefitAtMinimum / minimumSpend) * 100

      if (maximumBenefit !== null && benefitValue > 0) {
        transactionToMaximize = maximumBenefit / (benefitValue / 100)
        transactionToMaximize = Math.max(minimumSpend, transactionToMaximize)
      }
    } else if (type === 'cashback_fixed' || type === 'discount_fixed') {
      benefitAtMinimum = maximumBenefit !== null
        ? Math.min(benefitValue, maximumBenefit)
        : benefitValue
      benefitAtMinimum = Math.min(benefitAtMinimum, minimumSpend)
      effectiveDiscountAtMinimum = (benefitAtMinimum / minimumSpend) * 100
    }
  }

  const expectedFinalCost = minimumSpend !== null && benefitAtMinimum !== null
    ? Math.max(0, minimumSpend - benefitAtMinimum)
    : null

  const effectiveAtMax = transactionToMaximize && maximumBenefit !== null
    ? (maximumBenefit / transactionToMaximize) * 100
    : effectiveDiscountAtMinimum

  const expiry = fields.expiresAt ? new Date(fields.expiresAt) : null
  const daysRemaining = expiry && !Number.isNaN(expiry.getTime())
    ? Math.ceil((expiry.getTime() - now.getTime()) / 86400000)
    : null

  const score = effectiveDiscountAtMinimum
  const dealValueClassification = score === null
    ? 'unknown'
    : score >= 25
      ? 'excellent'
      : score >= 15
        ? 'strong'
        : score >= 8
          ? 'moderate'
          : 'low'

  return {
    effectiveDiscountAtMinimum: round(effectiveDiscountAtMinimum),
    benefitAtMinimum: round(benefitAtMinimum),
    transactionAmountToMaximizeBenefit: round(transactionToMaximize),
    effectiveDiscountAtBenefitCap: round(effectiveAtMax),
    recommendedTransactionRange: minimumSpend === null
      ? null
      : {
          minimum: round(minimumSpend),
          maximumRecommended: round(transactionToMaximize || minimumSpend),
        },
    expectedFinalCost: round(expectedFinalCost),
    dealValueClassification,
    daysRemaining,
    expiryStatus: daysRemaining === null
      ? 'unknown'
      : daysRemaining < 0
        ? 'expired'
        : daysRemaining <= 7
          ? 'expiring_soon'
          : 'active',
  }
}
