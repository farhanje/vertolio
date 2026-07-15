import { sha256Hex, stripHtml, extractTitleFromHtml, readJsonLd } from './base-adapter'
import { GenericHtmlPromotionAdapter } from './generic-html-adapter'
import { deriveOfferSummary, deriveRequirementsSummary } from '../promo/publishability'

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

export class BoundedGenericHtmlPromotionAdapter extends GenericHtmlPromotionAdapter {
  async extractPromotion(document) {
    const hint = document.promotionHint || {}
    const title = hint.title || extractTitleFromHtml(document.body)
    const rawText = stripHtml(document.body)
    const bounded = this.boundPromotionText(rawText, {document, title, rawText, hint})
    const boundedText = bounded.text || rawText.slice(0, 30000)
    const jsonLd = readJsonLd(document.body)
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

    fields.termsText = boundedText
    fields.offerSummary = deriveOfferSummary(fields, boundedText)
    fields.requirementsSummary = deriveRequirementsSummary(fields, boundedText)
    extracted.rawRelevantText = boundedText
    extracted.publicationDate = jsonLdDate(jsonLd, ['datePublished'])
    extracted.contentHash = sha256Hex(`${boundedText}\n${JSON.stringify(structuredHint)}`)
    extracted.boundaryDiagnostics = bounded.diagnostics

    if (
      bounded.diagnostics.status === 'unconfirmed'
      || bounded.diagnostics.status === 'truncated'
    ) {
      extracted.ambiguityWarnings = [...new Set([
        ...(extracted.ambiguityWarnings || []),
        `boundary_${bounded.diagnostics.status}`,
      ])]
    }

    return extracted
  }
}
