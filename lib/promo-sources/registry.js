import { BcaPromotionAdapter } from './bca-adapter'
import { GenericHtmlPromotionAdapter } from './generic-html-adapter'
import { UltraVoucherPromotionAdapter } from './ultra-voucher-adapter'

const ADAPTERS = {
  'generic-html': {
    AdapterClass: GenericHtmlPromotionAdapter,
    label: 'Generic public webpage',
    description: 'Best-effort link discovery and deterministic extraction. Review-only by default.',
  },
  bca: {
    AdapterClass: BcaPromotionAdapter,
    label: 'BCA promotions',
    description: 'Dedicated discovery for official BCA promotion detail pages.',
  },
  'ultra-voucher': {
    AdapterClass: UltraVoucherPromotionAdapter,
    label: 'Ultra Voucher catalog',
    description: 'Extracts public merchant discount offers from the official catalog.',
  },
}

export function registerPromotionSourceAdapter(key, AdapterClass, metadata = {}) {
  if (!key || typeof AdapterClass !== 'function') {
    throw new Error('A source adapter key and class are required')
  }
  ADAPTERS[key] = {
    AdapterClass,
    label: metadata.label || key,
    description: metadata.description || '',
  }
}

export function getPromotionSourceAdapter(source) {
  const key = source?.adapter_key || 'generic-html'
  const definition = ADAPTERS[key]

  if (!definition) {
    throw new Error(`Unsupported promotion source adapter: ${key}`)
  }

  return new definition.AdapterClass(source)
}

export function listPromotionSourceAdapters() {
  return Object.entries(ADAPTERS)
    .map(([key, definition]) => ({
      key,
      label: definition.label,
      description: definition.description,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function hasPromotionSourceAdapter(key) {
  return Boolean(ADAPTERS[key])
}
