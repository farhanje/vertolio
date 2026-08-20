import {cookies} from 'next/headers'
import {DEFAULT_LANGUAGE, normalizeLanguage} from './i18n'

export function getLanguage() {
  try {
    const store = cookies()
    const value = store.get('portfolio_lang')?.value || store.get('lang')?.value || DEFAULT_LANGUAGE
    return normalizeLanguage(value)
  } catch (_) {
    return DEFAULT_LANGUAGE
  }
}
