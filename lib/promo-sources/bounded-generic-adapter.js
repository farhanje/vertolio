import { sha256Hex, stripHtml, extractTitleFromHtml } from './base-adapter'
import { GenericHtmlPromotionAdapter } from './generic-html-adapter'
import { deriveOfferSummary, deriveRequirementsSummary } from '../promo/publishability'

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export class BoundedGenericHtmlPromotionAdapter extends GenericHtmlPromotionAdapter {
  async extractPromotion(document) {
    const hint = document.promotionHint || {}
    const title = hint.title || extractTitleFromHtml(document.body)
    const rawText = stripHtml(document.body)
    const bounded = this.boundPromotionText(rawText, {document, title, rawText, hint})
    const boundedText = bounded.text || rawText.slice(0, 30000)
    const syntheticBody = `<html><head><title>${escapeHtml(title)}</title></head><body><h1>${escapeHtml(title)}</h1><div>${escapeHtml(boundedText).replace(/\n/g, '<br>')}</div></body></html>`
    const extracted = await super.extractPromotion({...document, body: syntheticBody})
    const fields = extracted.extractedFields || {}

    fields.termsText = boundedText
    fields.offerSummary = deriveOfferSummary(fields, boundedText)
    fields.requirementsSummary = deriveRequirementsSummary(fields, boundedText)
    extracted.rawRelevantText = boundedText
    extracted.contentHash = sha256Hex(`${boundedText}\n${JSON.stringify(hint)}`)
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
