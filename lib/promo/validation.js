const CRITICAL_WARNINGS = new Set([
  'missing_title',
  'unclear_benefit',
  'invalid_dates',
  'invalid_percentage',
  'negative_benefit',
  'missing_source_url',
  'expiry_unavailable',
  'source_suspicious',
  'terms_contradictory',
  'low_confidence_benefit',
  'low_confidence_expiry',
])

function confidence(fields, key) {
  const value = Number(fields?.fieldConfidence?.[key])
  return Number.isFinite(value) ? value : null
}

export function validateExtractedPromotion(extracted) {
  const fields = extracted?.extractedFields || {}
  const warnings = [...(extracted?.ambiguityWarnings || [])]
  const errors = []

  if (!extracted?.sourceUrl) errors.push('missing_source_url')
  if (!fields.title) errors.push('missing_title')
  if (!String(fields.offerSummary || '').trim()) warnings.push('unclear_benefit')
  if (!fields.expiresAt) warnings.push('expiry_unavailable')

  if (fields.benefitType === 'percentage') {
    const value = Number(fields.benefitValue)
    if (!Number.isFinite(value) || value <= 0 || value > 100) errors.push('invalid_percentage')
  }

  if (fields.benefitValue !== null && fields.benefitValue !== undefined) {
    const value = Number(fields.benefitValue)
    if (!Number.isFinite(value) || value < 0) errors.push('negative_benefit')
  }

  if (fields.minimumSpend !== null && fields.minimumSpend !== undefined && Number(fields.minimumSpend) < 0) {
    errors.push('negative_minimum_spend')
  }

  if (fields.maximumBenefit !== null && fields.maximumBenefit !== undefined && Number(fields.maximumBenefit) < 0) {
    errors.push('negative_maximum_benefit')
  }

  if (fields.startsAt && fields.expiresAt) {
    const start = new Date(fields.startsAt)
    const end = new Date(fields.expiresAt)
    if (
      Number.isNaN(start.getTime())
      || Number.isNaN(end.getTime())
      || end.getTime() < start.getTime()
    ) {
      errors.push('invalid_dates')
    }
  }

  if (fields.sourceTrustLevel === 'suspicious') warnings.push('source_suspicious')
  if (fields.sourceTrustLevel === 'unverified') warnings.push('source_unverified')
  if ((fields.contradictions || []).length) warnings.push('terms_contradictory')

  const benefitConfidence = confidence(fields, 'benefit')
  const expiryConfidence = confidence(fields, 'expiresAt')
  if (benefitConfidence !== null && benefitConfidence < 0.6) warnings.push('low_confidence_benefit')
  if (expiryConfidence !== null && expiryConfidence < 0.6) warnings.push('low_confidence_expiry')

  const critical = [...new Set([...errors, ...warnings.filter((warning) => CRITICAL_WARNINGS.has(warning))])]

  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    critical,
  }
}

export function shouldAutoPublish({ source, extracted, validation }) {
  const fields = extracted?.extractedFields || {}
  if (!source?.auto_publish_enabled) return false
  if (!validation.valid || validation.critical.length) return false
  if (!extracted?.sourceUrl || !fields.title || fields.isPromotion === false) return false
  if (!['official_source', 'trusted_aggregator'].includes(fields.sourceTrustLevel)) return false
  if ((fields.contradictions || []).length) return false

  const confidenceValue = Number(extracted.extractionConfidence || 0)
  const threshold = Number(source.minimum_confidence || 0.85)
  return confidenceValue >= threshold
}
