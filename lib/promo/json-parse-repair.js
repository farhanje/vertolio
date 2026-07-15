const INSTALL_KEY = Symbol.for('vertolio.promoJsonParseRepairInstalled')

function removeTrailingCommas(value) {
  const source = String(value || '')
  let output = ''
  let inString = false
  let escaped = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]

    if (inString) {
      output += character
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        inString = false
      }
      continue
    }

    if (character === '"') {
      inString = true
      output += character
      continue
    }

    if (character === ',') {
      let nextIndex = index + 1
      while (nextIndex < source.length && /\s/.test(source[nextIndex])) nextIndex += 1
      if (source[nextIndex] === '}' || source[nextIndex] === ']') continue
    }

    output += character
  }

  return output
}

function isPromoIntelligenceJson(value) {
  const source = String(value || '')
  return source.includes('"isPromotion"')
    && source.includes('"promotionConfidence"')
    && source.includes('"evidence"')
}

export function installPromoJsonParseRepair() {
  if (globalThis[INSTALL_KEY]) return false

  const nativeParse = JSON.parse.bind(JSON)

  JSON.parse = function parseWithPromoRepair(value, reviver) {
    try {
      return nativeParse(value, reviver)
    } catch (originalError) {
      if (!isPromoIntelligenceJson(value)) throw originalError

      const repaired = removeTrailingCommas(value)
      if (repaired === String(value || '')) throw originalError

      return nativeParse(repaired, reviver)
    }
  }

  globalThis[INSTALL_KEY] = true
  return true
}

export function parsePromoJsonForTest(value) {
  const nativeParse = JSON.parse.bind(JSON)
  try {
    return nativeParse(value)
  } catch (originalError) {
    if (!isPromoIntelligenceJson(value)) throw originalError
    const repaired = removeTrailingCommas(value)
    if (repaired === String(value || '')) throw originalError
    return nativeParse(repaired)
  }
}
