import { sha256Hex, stripHtml, extractTitleFromHtml, readJsonLd } from './base-adapter'
import { GenericHtmlPromotionAdapter } from './generic-html-adapter'
import { findDateRange, PROMO_DATE_PARSER_VERSION } from './date-parser'
import {
  findFixedMonetaryBenefit,
  findMaximumMonetaryBenefit,
  findMinimumSpend,
  matchPercentage,
} from './money-parser'
import { deriveOfferSummary, deriveRequirementsSummary } from '../promo/publishability'

const GENERIC_FIELD_MAPPER_VERSION = 'generic-field-map-v2'

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function jsonLdDate(blocks, keys) {
  for (const block of blocks || []) {
    for (const key of keys) {
      const candidate = block?.[key] || block?.offers?.[key]
      if (!candidate) continue
      const parsed = new Date(candidate)
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
    }
  }
  return null
}

function isAfter(left, right) {
  if (!left || !right) return false
  const leftTime = new Date(left).getTime()
  const rightTime = new Date(right).getTime()
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime > rightTime
}

function mappedBenefitFields(fields, boundedText) {
  const offerText = boundedText.split('\n').slice(0, 14).join('\n')
  const percentage = matchPercentage(offerText)
  const fixedBenefit = findFixedMonetaryBenefit(offerText)
  return {
    minimumSpend: findMinimumSpend(boundedText),
    maximumBenefit: findMaximumMonetaryBenefit(boundedText),
    benefitType: percentage
      ? 'percentage'
      : fixedBenefit
        ? (/cashback/i.test(offerText) ? 'cashback_fixed' : 'discount_fixed')
        : fields.benefitType || null,
    benefitValue: percentage || fixedBenefit || null,
  }
}

export class BoundedGenericHtmlPromotionAdapter extends GenericHtmlPromotionAdapter {
  async extractPromotion(document) {
    const hint = document.promotionHint || {}
    const title = hint.title || extractTitleFromHtml(document.body)
    const rawText = stripHtml(document.body)
    const bounded = this.boundPromotionText(rawText, {document, title, rawText, hint})
    const boundedText = bounded.text || rawText.slice(0, 30000)
    const jsonLd = readJsonLd(document.body)
    const evidenceDates = findDateRange(boundedText)
    const structuredHint = {
      ...hint,
      startsAt: hint.startsAt || jsonLdDate(jsonLd, ['validFrom']),
      expiresAt: hint.expiresAt || jsonLdDate(jsonLd, ['validThrough', 'expires']),
    }
    const syntheticBody = `<html><head><title>${escapeHtml(title)}</title></head><body><h1>${escapeHtml(title)}</h1><div>${escapeHtml(boundedText).replace(/\n/g, '<br>')}</div></body></html>`
    const extracted = await super.extractPromotion({
      ...document,
      body: syntheticBody,
      promotionHint: structuredHint,
    })
    const fields = extracted.extractedFields || {}
    const dateAnomalies = [...(evidenceDates.anomalies || [])]
    const mappedBenefit = mappedBenefitFields(fields, boundedText)

    let startsAt = structuredHint.startsAt || evidenceDates.startsAt || null
    const expiresAt = structuredHint.expiresAt || evidenceDates.expiresAt || null
    if (isAfter(startsAt, expiresAt)) {
      startsAt = null
      dateAnomalies.push('structured_start_after_expiry_cleared')
    }

    fields.startsAt = startsAt
    fields.expiresAt = expiresAt
    fields.minimumSpend = hint.minimumSpend ?? mappedBenefit.minimumSpend
    fields.maximumBenefit = hint.maximumBenefit ?? mappedBenefit.maximumBenefit
    fields.benefitType = hint.benefitType || mappedBenefit.benefitType
    fields.benefitValue = hint.benefitValue ?? mappedBenefit.benefitValue
    fields.termsText = boundedText
    fields.offerSummary = deriveOfferSummary(fields, boundedText)
    fields.requirementsSummary = deriveRequirementsSummary(fields, boundedText)
    fields.fieldEvidence = {...(fields.fieldEvidence || {})}
    fields.fieldConfidence = {...(fields.fieldConfidence || {})}
    fields.sourceMappingVersion = fields.sourceMappingVersion || GENERIC_FIELD_MAPPER_VERSION

    if (startsAt && !structuredHint.startsAt && evidenceDates.evidence?.startsAt) {
      fields.fieldEvidence.startsAt = evidenceDates.evidence.startsAt
      fields.fieldConfidence.startsAt = 0.98
    }
    if (expiresAt && !structuredHint.expiresAt && evidenceDates.evidence?.expiresAt) {
      fields.fieldEvidence.expiresAt = evidenceDates.evidence.expiresAt
      fields.fieldConfidence.expiresAt = 0.98
    }

    const warnings = new Set(extracted.ambiguityWarnings || [])
    warnings.delete('expiry_unavailable')
    warnings.delete('unclear_benefit')
    warnings.delete('minimum_spend_unavailable')
    if (!expiresAt) warnings.add('expiry_unavailable')
    if (!fields.offerSummary) warnings.add('unclear_benefit')
    if (fields.minimumSpend === null || fields.minimumSpend === undefined) warnings.add('minimum_spend_unavailable')

    extracted.rawRelevantText = boundedText
    extracted.publicationDate = jsonLdDate(jsonLd, ['datePublished'])
    extracted.contentHash = sha256Hex(`${PROMO_DATE_PARSER_VERSION}\n${GENERIC_FIELD_MAPPER_VERSION}\n${boundedText}\n${JSON.stringify(structuredHint)}`)
    extracted.boundaryDiagnostics = {
      ...bounded.diagnostics,
      dateParsing: {
        parserVersion: PROMO_DATE_PARSER_VERSION,
        strategy: structuredHint.startsAt || structuredHint.expiresAt ? 'structured_validity' : evidenceDates.strategy,
        startSource: structuredHint.startsAt ? 'structured_validFrom' : evidenceDates.startsAt ? 'bounded_text' : 'none',
        expirySource: structuredHint.expiresAt ? 'structured_validThrough' : evidenceDates.expiresAt ? 'bounded_text' : 'none',
        evidence: evidenceDates.evidence,
        anomalies: [...new Set(dateAnomalies)],
      },
      fieldMapping: {
        mapperVersion: GENERIC_FIELD_MAPPER_VERSION,
        minimumSpend: fields.minimumSpend,
        benefitType: fields.benefitType,
        benefitValue: fields.benefitValue,
        maximumBenefit: fields.maximumBenefit,
      },
    }
    extracted.ambiguityWarnings = [...warnings]

    if (
      bounded.diagnostics.status === 'unconfirmed'
      || bounded.diagnostics.status === 'truncated'
    ) {
      extracted.ambiguityWarnings = [...new Set([
        ...extracted.ambiguityWarnings,
        `boundary_${bounded.diagnostics.status}`,
      ])]
    }

    return extracted
  }
}
