const MONTHS = {
  jan: 0,
  januari: 0,
  january: 0,
  feb: 1,
  februari: 1,
  february: 1,
  mar: 2,
  maret: 2,
  march: 2,
  apr: 3,
  april: 3,
  mei: 4,
  may: 4,
  jun: 5,
  juni: 5,
  june: 5,
  jul: 6,
  juli: 6,
  july: 6,
  agu: 7,
  agt: 7,
  agustus: 7,
  august: 7,
  sep: 8,
  september: 8,
  okt: 9,
  oktober: 9,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  des: 11,
  desember: 11,
  dec: 11,
  december: 11,
}

const MONTH_PATTERN = Object.keys(MONTHS)
  .sort((left, right) => right.length - left.length)
  .join('|')

const RANGE_SEPARATOR = '(?:-|–|—|sampai(?:\\s+dengan)?|hingga|s\\.?\\s*d\\.?|s\\/d|to|until)'
const EXPIRY_CUE = /\b(berlaku\s+hingga|periode(?:\s+promo)?\s+hingga|berakhir(?:\s+pada)?|sampai(?:\s+dengan)?|valid\s+until|valid\s+through|expires?|expiry)\b/i
const START_CUE = /\b(berlaku\s+mulai|mulai(?:\s+dari)?|dimulai(?:\s+pada)?|periode(?:\s+promo)?\s+mulai|valid\s+from|starts?(?:\s+on)?)\b/i

export const PROMO_DATE_PARSER_VERSION = 'evidence-date-v3'

function normalizeLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function parseDateParts(day, monthName, year) {
  const month = MONTHS[String(monthName || '').toLowerCase()]
  if (month === undefined) return null

  const yyyy = Number(year)
  const dd = Number(day)
  if (!Number.isInteger(yyyy) || !Number.isInteger(dd)) return null

  const value = new Date(Date.UTC(yyyy, month, dd, 0, 0, 0))
  if (Number.isNaN(value.getTime())) return null
  if (value.getUTCFullYear() !== yyyy || value.getUTCMonth() !== month || value.getUTCDate() !== dd) return null
  return value.toISOString()
}

function parseIsoDate(year, month, day) {
  const yyyy = Number(year)
  const mm = Number(month)
  const dd = Number(day)
  if (!Number.isInteger(yyyy) || !Number.isInteger(mm) || !Number.isInteger(dd)) return null

  const value = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0))
  if (Number.isNaN(value.getTime())) return null
  if (value.getUTCFullYear() !== yyyy || value.getUTCMonth() !== mm - 1 || value.getUTCDate() !== dd) return null
  return value.toISOString()
}

function compareDates(left, right) {
  if (!left || !right) return null
  const leftTime = new Date(left).getTime()
  const rightTime = new Date(right).getTime()
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return null
  return leftTime - rightTime
}

function durationDays(startsAt, expiresAt) {
  const comparison = compareDates(expiresAt, startsAt)
  return comparison === null ? null : comparison / (24 * 60 * 60 * 1000)
}

function finalize({startsAt = null, expiresAt = null, evidence = {}, strategy = 'none', explicitRange = false, anomalies = []}) {
  const safeAnomalies = [...anomalies]
  let safeStart = startsAt

  const comparison = compareDates(safeStart, expiresAt)
  if (comparison !== null && comparison > 0) {
    safeStart = null
    safeAnomalies.push('start_after_expiry_cleared')
  } else if (comparison === 0 && !explicitRange) {
    safeStart = null
    safeAnomalies.push('duplicate_expiry_not_used_as_start')
  }

  return {
    startsAt: safeStart,
    expiresAt,
    evidence: {
      startsAt: safeStart ? evidence.startsAt || '' : '',
      expiresAt: expiresAt ? evidence.expiresAt || '' : '',
    },
    strategy,
    anomalies: [...new Set(safeAnomalies)],
  }
}

function explicitWordRange(line) {
  const differentMonths = new RegExp(
    `(\\d{1,2})\\s+(${MONTH_PATTERN})(?:\\s+(20\\d{2}))?\\s*${RANGE_SEPARATOR}\\s*(\\d{1,2})\\s+(${MONTH_PATTERN})\\s+(20\\d{2})`,
    'i',
  ).exec(line)

  if (differentMonths) {
    const startsAt = parseDateParts(differentMonths[1], differentMonths[2], differentMonths[3] || differentMonths[6])
    const expiresAt = parseDateParts(differentMonths[4], differentMonths[5], differentMonths[6])
    if (startsAt && expiresAt) return {startsAt, expiresAt}
  }

  const sharedMonth = new RegExp(
    `(\\d{1,2})\\s*${RANGE_SEPARATOR}\\s*(\\d{1,2})\\s+(${MONTH_PATTERN})\\s+(20\\d{2})`,
    'i',
  ).exec(line)

  if (sharedMonth) {
    const startsAt = parseDateParts(sharedMonth[1], sharedMonth[3], sharedMonth[4])
    const expiresAt = parseDateParts(sharedMonth[2], sharedMonth[3], sharedMonth[4])
    if (startsAt && expiresAt) return {startsAt, expiresAt}
  }

  return null
}

function explicitIsoRange(line) {
  const match = new RegExp(
    `(20\\d{2})-(\\d{2})-(\\d{2})\\s*${RANGE_SEPARATOR}\\s*(20\\d{2})-(\\d{2})-(\\d{2})`,
    'i',
  ).exec(line)
  if (!match) return null

  const startsAt = parseIsoDate(match[1], match[2], match[3])
  const expiresAt = parseIsoDate(match[4], match[5], match[6])
  return startsAt && expiresAt ? {startsAt, expiresAt} : null
}

function dateCandidates(line) {
  const candidates = []
  const wordPattern = new RegExp(`(\\d{1,2})\\s+(${MONTH_PATTERN})\\s+(20\\d{2})`, 'gi')
  let wordMatch

  while ((wordMatch = wordPattern.exec(line))) {
    const iso = parseDateParts(wordMatch[1], wordMatch[2], wordMatch[3])
    if (iso) candidates.push({iso, index: wordMatch.index, raw: wordMatch[0]})
  }

  const isoPattern = /\b(20\d{2})-(\d{2})-(\d{2})\b/g
  let isoMatch
  while ((isoMatch = isoPattern.exec(line))) {
    const iso = parseIsoDate(isoMatch[1], isoMatch[2], isoMatch[3])
    if (iso) candidates.push({iso, index: isoMatch.index, raw: isoMatch[0]})
  }

  return candidates.sort((left, right) => left.index - right.index)
}

function chooseExplicitRange(ranges) {
  if (!ranges.length) return null
  const primary = ranges[0]
  const primaryDuration = durationDays(primary.startsAt, primary.expiresAt)
  const detailed = ranges.slice(1).filter((item) => {
    const duration = durationDays(item.startsAt, item.expiresAt)
    return duration !== null && duration >= 0 && duration <= 120
  })

  if (primaryDuration !== null && primaryDuration > 370 && detailed.length >= 2) {
    const starts = detailed.map((item) => item.startsAt).sort()
    const expiries = detailed.map((item) => item.expiresAt).sort()
    const startsAt = starts[0]
    const expiresAt = expiries[expiries.length - 1]
    const combinedDuration = durationDays(startsAt, expiresAt)
    const sameYear = new Date(startsAt).getUTCFullYear() === new Date(expiresAt).getUTCFullYear()

    if (combinedDuration !== null && combinedDuration <= 180 && sameYear) {
      return {
        startsAt,
        expiresAt,
        evidence: detailed.map((item) => item.line).join(' | '),
        strategy: 'detailed_ranges_repaired',
        anomalies: ['suspicious_long_range_replaced_by_detail_ranges'],
      }
    }
  }

  return {
    startsAt: primary.startsAt,
    expiresAt: primary.expiresAt,
    evidence: primary.line,
    strategy: 'explicit_range',
    anomalies: [],
  }
}

export function findDateRange(text) {
  const lines = String(text || '')
    .split('\n')
    .map(normalizeLine)
    .filter(Boolean)

  const explicitRanges = []
  for (const line of lines) {
    const range = explicitWordRange(line) || explicitIsoRange(line)
    if (range) explicitRanges.push({...range, line})
  }

  const selectedRange = chooseExplicitRange(explicitRanges)
  if (selectedRange) {
    return finalize({
      startsAt: selectedRange.startsAt,
      expiresAt: selectedRange.expiresAt,
      evidence: {startsAt: selectedRange.evidence, expiresAt: selectedRange.evidence},
      strategy: selectedRange.strategy,
      explicitRange: true,
      anomalies: selectedRange.anomalies,
    })
  }

  let startsAt = null
  let expiresAt = null
  let startEvidence = ''
  let expiryEvidence = ''

  for (const line of lines) {
    const candidates = dateCandidates(line)
    if (!candidates.length) continue

    if (!expiresAt && EXPIRY_CUE.test(line)) {
      const candidate = candidates[candidates.length - 1]
      expiresAt = candidate.iso
      expiryEvidence = line
    }

    if (!startsAt && START_CUE.test(line) && !EXPIRY_CUE.test(line)) {
      const candidate = candidates[0]
      startsAt = candidate.iso
      startEvidence = line
    }
  }

  return finalize({
    startsAt,
    expiresAt,
    evidence: {startsAt: startEvidence, expiresAt: expiryEvidence},
    strategy: startsAt || expiresAt ? 'labeled_dates' : 'none',
    explicitRange: false,
  })
}
