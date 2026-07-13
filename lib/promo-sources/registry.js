import { GenericHtmlPromotionAdapter } from './generic-html-adapter'

const ADAPTERS = {
  'generic-html': GenericHtmlPromotionAdapter,
}

export function registerPromotionSourceAdapter(key, AdapterClass) {
  if (!key || typeof AdapterClass !== 'function') {
    throw new Error('A source adapter key and class are required')
  }
  ADAPTERS[key] = AdapterClass
}

export function getPromotionSourceAdapter(source) {
  const key = source?.adapter_key || 'generic-html'
  const AdapterClass = ADAPTERS[key]

  if (!AdapterClass) {
    throw new Error(`Unsupported promotion source adapter: ${key}`)
  }

  return new AdapterClass(source)
}

export function listPromotionSourceAdapters() {
  return Object.keys(ADAPTERS).sort()
}
