import { BoundedGenericHtmlPromotionAdapter } from './bounded-generic-adapter'
import { extractAnchorLinks } from './generic-html-adapter'
import { fetchWithTimeout } from './base-adapter'
import { mapBcaPromotionFields } from './bca-source-mapper'

function isBcaPromotionDetail(url) {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.endsWith('bca.co.id')) return false
    return /\/id\/(?:[^/]+\/)?20\d{2}\/\d{2}\/\d{2}\//i.test(parsed.pathname)
  } catch (_) {
    return false
  }
}

export class BcaPromotionAdapter extends BoundedGenericHtmlPromotionAdapter {
  getBoundaryContract({title} = {}) {
    return {
      startMarkers: title ? [title] : [],
      endMarkers: [
        /^Bagikan promo ini$/i,
        /^Promo Serupa$/i,
        /^Lihat semua promo$/i,
      ],
      startOccurrence: 'first',
      requireStart: Boolean(title),
      requireEnd: true,
      maxChars: 18000,
    }
  }

  async discoverPromotionUrls() {
    const response = await fetchWithTimeout(this.source.base_url, {
      timeoutMs: this.source.request_timeout_ms,
    })
    if (!response.ok) throw new Error(`BCA discovery returned HTTP ${response.status}`)

    const html = await response.text()
    const links = extractAnchorLinks(html, this.source.base_url, {sameHostname: false})
      .filter((item) => isBcaPromotionDetail(item.url))

    const unique = new Map()
    for (const item of links) {
      if (!unique.has(item.url)) unique.set(item.url, item)
    }

    return [...unique.values()].slice(0, Number(this.source.max_pages_per_run || 25))
  }

  async extractPromotion(document) {
    const extracted = await super.extractPromotion(document)
    const mapped = mapBcaPromotionFields(extracted)

    extracted.extractedFields = mapped.fields
    extracted.contentHash = mapped.contentHash
    extracted.boundaryDiagnostics = {
      ...(extracted.boundaryDiagnostics || {}),
      sourceMapping: mapped.diagnostics,
    }
    extracted.extractionConfidence = Number(Math.min(1, Math.max(
      Number(extracted.extractionConfidence || 0),
      mapped.fields.merchant && mapped.fields.sourceCategoryLabel ? 0.93 : 0.86,
    )).toFixed(3))
    return extracted
  }
}
