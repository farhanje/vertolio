const CRITICAL_WARNINGS = new Set([
  'missing_title',
  'unclear_benefit',
  'invalid_dates',
  'invalid_percentage',
  'negative_benefit',
  'missing_source_url',
])

export function validateExtractedPromotion(extracted) {
  const fields = extracted?.extractedFields || {}
  const warnings = [...(extracted?.ambiguityWarnings || [])]
  const errors = []

  if (!extracted?.sourceUrl) errors.push('missing_source_url')
  if (!fields.title) errors.push('missing_title')

  if (fields.benefitType === 'percentage') {
    const value = Number(fields.benefitValue)
    if (!Number.isFinite(value) || value <= 0 || value > 100) errors.push('invalid_percentage')
  }

  if (fields.benefitValue !== null && fields.benefitValue !== undefined) {
    const value = Number(fields.benefitValue)
    if (!Number.isFinite(value) || value < 0) errors.push('negative_benefit')
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

  const critical = [...new Set([...errors, ...warnings.filter((warning) => CRITICAL_WARNINGS.has(warning))])]

  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    critical,
  }
}

export function shouldAutoPublish({ source, extracted, validation }) {
  if (!source?.auto_publish_enabled) return false
  if (!validation.valid || validation.critical.length) return false
  if (!extracted?.sourceUrl || !extracted?.extractedFields?.title) return false

  const confidence = Number(extracted.extractionConfidence || 0)
  const threshold = Number(source.minimum_confidence || 0.85)
  return confidence >= threshold
}
