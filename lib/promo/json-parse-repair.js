const INSTALL_KEY = Symbol.for('vertolio.promoJsonParseRepairInstalled')
const NATIVE_PARSE_KEY = Symbol.for('vertolio.nativeJsonParse')

if (!globalThis[NATIVE_PARSE_KEY]) {
  globalThis[NATIVE_PARSE_KEY] = JSON.parse.bind(JSON)
}

function nativeParse(value, reviver) {
  return globalThis[NATIVE_PARSE_KEY](value, reviver)
}

function looksLikePromoIntelligenceJson(value) {
  const source = String(value || '').replace(/["']/g, '')
  const markers = [
    'isPromotion',
    'promotionConfidence',
    'normalizedTitle',
    'benefitType',
    'primaryCategory',
    'evidence',
  ]
  return markers.filter((marker) => source.includes(`${marker}:`)).length >= 2
}

function stripJsonComments(value) {
  const source = String(value || '')
  let output = ''
  let inString = false
  let escaped = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    const next = source[index + 1]

    if (inString) {
      output += character
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') inString = false
      continue
    }

    if (character === '"') {
      inString = true
      output += character
      continue
    }

    if (character === '/' && next === '/') {
      index += 2
      while (index < source.length && source[index] !== '\n') index += 1
      if (index < source.length) output += '\n'
      continue
    }

    if (character === '/' && next === '*') {
      index += 2
      while (index < source.length - 1 && !(source[index] === '*' && source[index + 1] === '/')) index += 1
      index += 1
      continue
    }

    output += character
  }

  return output
}

function removeInvalidCommas(value) {
  const source = String(value || '')
  let output = ''
  let inString = false
  let escaped = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]

    if (inString) {
      output += character
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') inString = false
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
      if (source[nextIndex] === '}' || source[nextIndex] === ']' || source[nextIndex] === ',') continue
    }

    output += character
  }

  return output
}

function quoteUnquotedObjectKeys(value) {
  const source = String(value || '')
  const stack = []
  let output = ''
  let inString = false
  let escaped = false
  let expectingKey = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]

    if (inString) {
      output += character
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') inString = false
      continue
    }

    if (character === '"') {
      inString = true
      expectingKey = false
      output += character
      continue
    }

    if (character === '{') {
      stack.push('{')
      expectingKey = true
      output += character
      continue
    }

    if (character === '[') {
      stack.push('[')
      expectingKey = false
      output += character
      continue
    }

    if (character === '}' || character === ']') {
      stack.pop()
      expectingKey = false
      output += character
      continue
    }

    if (character === ',') {
      expectingKey = stack[stack.length - 1] === '{'
      output += character
      continue
    }

    if (expectingKey && /\s/.test(character)) {
      output += character
      continue
    }

    if (expectingKey && character === "'") {
      let key = ''
      let keyEscaped = false
      let cursor = index + 1
      for (; cursor < source.length; cursor += 1) {
        const current = source[cursor]
        if (keyEscaped) {
          key += current
          keyEscaped = false
        } else if (current === '\\') {
          keyEscaped = true
        } else if (current === "'") {
          break
        } else {
          key += current
        }
      }
      output += JSON.stringify(key)
      index = cursor
      expectingKey = false
      continue
    }

    if (expectingKey && /[A-Za-z_$]/.test(character)) {
      let cursor = index + 1
      while (cursor < source.length && /[A-Za-z0-9_$-]/.test(source[cursor])) cursor += 1
      let colonIndex = cursor
      while (colonIndex < source.length && /\s/.test(source[colonIndex])) colonIndex += 1
      if (source[colonIndex] === ':') {
        output += JSON.stringify(source.slice(index, cursor))
        index = cursor - 1
        expectingKey = false
        continue
      }
    }

    expectingKey = false
    output += character
  }

  return output
}

function escapeRawControlCharacters(value) {
  const source = String(value || '')
  let output = ''
  let inString = false
  let escaped = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]

    if (!inString) {
      if (character === '"') inString = true
      output += character
      continue
    }

    if (escaped) {
      output += character
      escaped = false
      continue
    }

    if (character === '\\') {
      output += character
      escaped = true
      continue
    }

    if (character === '"') {
      inString = false
      output += character
      continue
    }

    if (character === '\n') output += '\\n'
    else if (character === '\r') output += '\\r'
    else if (character === '\t') output += '\\t'
    else if (character.charCodeAt(0) < 0x20) output += `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`
    else output += character
  }

  return output
}

function errorPosition(error) {
  const match = String(error?.message || '').match(/position\s+(\d+)/i)
  return match ? Number(match[1]) : null
}

function errorWithContext(error, source) {
  const position = errorPosition(error)
  if (!Number.isFinite(position)) return error
  const start = Math.max(0, position - 120)
  const end = Math.min(source.length, position + 120)
  const excerpt = source.slice(start, end).replace(/\s+/g, ' ')
  return new SyntaxError(`${error.message}; nearby=${JSON.stringify(excerpt)}`)
}

function repairPromoJson(value, reviver) {
  const source = String(value || '')
  let originalError

  try {
    return nativeParse(source, reviver)
  } catch (error) {
    originalError = error
  }

  if (!looksLikePromoIntelligenceJson(source)) throw originalError

  const candidates = []
  let candidate = stripJsonComments(source)
  candidates.push(candidate)
  candidate = removeInvalidCommas(candidate)
  candidates.push(candidate)
  candidate = quoteUnquotedObjectKeys(candidate)
  candidates.push(candidate)
  candidate = escapeRawControlCharacters(candidate)
  candidates.push(candidate)

  let lastError = originalError
  const attempted = new Set([source])
  for (const repaired of candidates) {
    if (!repaired || attempted.has(repaired)) continue
    attempted.add(repaired)
    try {
      return nativeParse(repaired, reviver)
    } catch (error) {
      lastError = error
    }
  }

  throw errorWithContext(lastError, candidate || source)
}

export function installPromoJsonParseRepair() {
  if (globalThis[INSTALL_KEY]) return false

  JSON.parse = function parseWithPromoRepair(value, reviver) {
    return repairPromoJson(value, reviver)
  }

  globalThis[INSTALL_KEY] = true
  return true
}

export function parsePromoJsonForTest(value) {
  return repairPromoJson(value)
}
