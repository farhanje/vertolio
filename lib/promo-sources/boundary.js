function normalizeLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function markerLabel(marker) {
  if (marker instanceof RegExp) return marker.toString()
  return String(marker || '')
}

function markerMatches(line, marker) {
  const value = normalizeLine(line)
  if (!value) return false
  if (marker instanceof RegExp) {
    marker.lastIndex = 0
    return marker.test(value)
  }
  const expected = normalizeLine(marker).toLowerCase()
  return Boolean(expected) && value.toLowerCase() === expected
}

function findMarker(lines, markers, options = {}) {
  if (!Array.isArray(markers) || !markers.length) return null
  const matches = []
  const from = Math.max(0, Number(options.from || 0))
  const occurrence = options.occurrence === 'last' ? 'last' : 'first'

  for (let index = from; index < lines.length; index += 1) {
    const marker = markers.find((candidate) => markerMatches(lines[index], candidate))
    if (!marker) continue
    const match = {index, marker: markerLabel(marker), line: normalizeLine(lines[index])}
    if (occurrence === 'first') return match
    matches.push(match)
  }

  return matches.length ? matches[matches.length - 1] : null
}

function removeExcludedLines(lines, patterns = []) {
  if (!Array.isArray(patterns) || !patterns.length) return lines
  return lines.filter((line) => !patterns.some((pattern) => markerMatches(line, pattern)))
}

export function applyTextBoundary(input, contract = {}) {
  const original = String(input || '').replace(/\r/g, '').trim()
  const lines = original.split('\n').map(normalizeLine).filter(Boolean)
  const start = findMarker(lines, contract.startMarkers || [], {
    occurrence: contract.startOccurrence === 'last' ? 'last' : 'first',
  })
  const startIndex = start ? start.index : 0
  const end = findMarker(lines, contract.endMarkers || [], {
    from: startIndex + (start ? 1 : 0),
  })
  const endIndex = end ? end.index : lines.length
  const selectedLines = removeExcludedLines(lines.slice(startIndex, endIndex), contract.excludeLinePatterns)
  const maxChars = Math.max(500, Number(contract.maxChars || 30000))
  const joined = selectedLines.join('\n').trim()
  const text = joined.slice(0, maxChars).trim()
  const truncated = joined.length > maxChars
  const startRequired = Boolean(contract.requireStart)
  const endRequired = Boolean(contract.requireEnd)
  const startSatisfied = !startRequired || Boolean(start)
  const endSatisfied = !endRequired || Boolean(end)

  let status = 'bounded'
  if (!startSatisfied || !endSatisfied) status = 'unconfirmed'
  else if (truncated) status = 'truncated'
  else if (!start && !end) status = 'generic'

  return {
    text,
    diagnostics: {
      status,
      originalCharacters: original.length,
      boundedCharacters: text.length,
      originalLines: lines.length,
      boundedLines: selectedLines.length,
      removedCharacters: Math.max(0, original.length - text.length),
      startMarker: start?.marker || null,
      startLine: start?.line || null,
      startIndex: start?.index ?? null,
      endMarker: end?.marker || null,
      endLine: end?.line || null,
      endIndex: end?.index ?? null,
      startRequired,
      endRequired,
      startSatisfied,
      endSatisfied,
      truncated,
    },
  }
}

export function boundaryContractFromConfig(config = {}) {
  const value = config && typeof config === 'object' ? config : {}
  const toStrings = (items) => Array.isArray(items) ? items.map(String).filter(Boolean) : []

  return {
    startMarkers: toStrings(value.start_markers),
    endMarkers: toStrings(value.end_markers),
    excludeLinePatterns: toStrings(value.exclude_lines),
    startOccurrence: value.start_occurrence === 'last' ? 'last' : 'first',
    requireStart: Boolean(value.require_start),
    requireEnd: Boolean(value.require_end),
    maxChars: Math.max(500, Math.min(Number(value.max_chars || 30000), 100000)),
  }
}
