const INTERVALS = {
  every_hour: 60,
  every_3_hours: 180,
  every_6_hours: 360,
  every_12_hours: 720,
  daily: 1440,
  weekly: 10080,
}

function parseNumber(value, min, max) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`Cron value ${value} must be between ${min} and ${max}`)
  }
  return number
}

function expandCronPart(part, min, max) {
  const values = new Set()

  for (const token of String(part || '').split(',')) {
    const trimmed = token.trim()
    if (!trimmed) continue

    const [rangePart, stepPart] = trimmed.split('/')
    const step = stepPart ? parseNumber(stepPart, 1, max - min + 1) : 1

    if (rangePart === '*') {
      for (let value = min; value <= max; value += step) values.add(value)
      continue
    }

    if (rangePart.includes('-')) {
      const [startRaw, endRaw] = rangePart.split('-')
      const start = parseNumber(startRaw, min, max)
      const end = parseNumber(endRaw, min, max)
      if (end < start) throw new Error(`Invalid cron range: ${rangePart}`)
      for (let value = start; value <= end; value += step) values.add(value)
      continue
    }

    values.add(parseNumber(rangePart, min, max))
  }

  if (!values.size) throw new Error(`Invalid cron field: ${part}`)
  return values
}

function cronPartsForDate(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'Asia/Jakarta',
    minute: '2-digit',
    hour: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    weekday: 'short',
    hourCycle: 'h23',
  })

  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

  return {
    minute: Number(parts.minute),
    hour: Number(parts.hour),
    dayOfMonth: Number(parts.day),
    month: Number(parts.month),
    dayOfWeek: weekdays[parts.weekday],
  }
}

export function nextCronOccurrence(expression, from = new Date(), timezone = 'Asia/Jakarta') {
  const fields = String(expression || '').trim().split(/\s+/)
  if (fields.length !== 5) {
    throw new Error('Custom cron must contain five fields: minute hour day month weekday')
  }

  const minute = expandCronPart(fields[0], 0, 59)
  const hour = expandCronPart(fields[1], 0, 23)
  const dayOfMonth = expandCronPart(fields[2], 1, 31)
  const month = expandCronPart(fields[3], 1, 12)
  const dayOfWeek = expandCronPart(fields[4], 0, 7)
  if (dayOfWeek.has(7)) {
    dayOfWeek.delete(7)
    dayOfWeek.add(0)
  }

  const dayOfMonthWildcard = fields[2] === '*'
  const dayOfWeekWildcard = fields[4] === '*'
  const candidate = new Date(from)
  candidate.setUTCSeconds(0, 0)
  candidate.setUTCMinutes(candidate.getUTCMinutes() + 1)

  const maxChecks = 366 * 24 * 60
  for (let index = 0; index < maxChecks; index += 1) {
    const parts = cronPartsForDate(candidate, timezone)
    const dateMatches = dayOfMonthWildcard || dayOfWeekWildcard
      ? dayOfMonth.has(parts.dayOfMonth) && dayOfWeek.has(parts.dayOfWeek)
      : dayOfMonth.has(parts.dayOfMonth) || dayOfWeek.has(parts.dayOfWeek)

    if (
      minute.has(parts.minute)
      && hour.has(parts.hour)
      && month.has(parts.month)
      && dateMatches
    ) {
      return candidate.toISOString()
    }

    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1)
  }

  throw new Error('No matching cron occurrence found within one year')
}

export function computeNextRunAt(source, from = new Date()) {
  if (source?.check_frequency === 'custom_cron' || source?.cron_expression) {
    if (!source?.cron_expression) throw new Error('cron_expression is required for custom_cron')
    return nextCronOccurrence(source.cron_expression, from, source.timezone || 'Asia/Jakarta')
  }

  const configured = Number(source?.check_interval_minutes)
  const minutes = INTERVALS[source?.check_frequency] || (configured > 0 ? configured : 360)
  return new Date(from.getTime() + minutes * 60 * 1000).toISOString()
}

export function retryDelayMinutes(attemptNumber) {
  if (attemptNumber <= 1) return 15
  if (attemptNumber === 2) return 60
  return 360
}

export function sourceHealthForFailures(count) {
  if (count <= 0) return 'healthy'
  if (count === 1) return 'delayed'
  if (count === 2) return 'degraded'
  return 'failing'
}
