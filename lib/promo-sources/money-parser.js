const UNIT_MULTIPLIERS = {
  ribu: 1_000,
  rb: 1_000,
  k: 1_000,
  juta: 1_000_000,
  jt: 1_000_000,
  million: 1_000_000,
  mio: 1_000_000,
  miliar: 1_000_000_000,
  billion: 1_000_000_000,
}

const UNIT_PATTERN = '(ribu|rb|k|juta|jt|million|mio|miliar|billion)'
const CURRENCY_PATTERN = '(?:Rp|IDR)'

function normalizedNumber(value) {
  let text = String(value || '').trim().replace(/\s+/g, '')
  if (!text) return null

  if (text.includes('.') && text.includes(',')) {
    text = text.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, '')
  } else if (/^\d{1,3}(?:,\d{3})+$/.test(text)) {
    text = text.replace(/,/g, '')
  } else {
    text = text.replace(',', '.')
  }

  text = text.replace(/[^\d.]/g, '')
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

export function parseMoney(value, suffix = '') {
  const number = normalizedNumber(value)
  if (number === null) return null
  const unit = String(suffix || '').toLowerCase()
  return number * (UNIT_MULTIPLIERS[unit] || 1)
}

function amountFromMatch(match) {
  if (!match) return null
  const amount = parseMoney(match[1], match[2])
  if (amount === null || amount < 0) return null
  return amount
}

export function matchMoney(text, labels, {maxDistance = 64} = {}) {
  const source = String(text || '')

  for (const label of labels || []) {
    const currency = new RegExp(
      `${label}[\\s\\S]{0,${maxDistance}}?${CURRENCY_PATTERN}\\s*([\\d.]+(?:,\\d+)?)\\s*${UNIT_PATTERN}?\\b(?!\\s*%)`,
      'i',
    ).exec(source)
    const currencyAmount = amountFromMatch(currency)
    if (currencyAmount !== null) return currencyAmount

    const unitOnly = new RegExp(
      `${label}[\\s\\S]{0,${maxDistance}}?([\\d]+(?:[.,]\\d+)?)\\s*${UNIT_PATTERN}\\b(?!\\s*%)`,
      'i',
    ).exec(source)
    const unitAmount = amountFromMatch(unitOnly)
    if (unitAmount !== null) return unitAmount
  }

  return null
}

export function matchPercentage(text, {preferFirstLine = true} = {}) {
  const source = String(text || '')
  const lines = preferFirstLine ? source.split('\n') : [source]

  for (const line of lines) {
    const candidates = [...line.matchAll(/(\d{1,3}(?:[.,]\d+)?)\s*%/g)]
      .map((match) => Number(String(match[1]).replace(',', '.')))
      .filter((value) => Number.isFinite(value) && value > 0 && value <= 100)
    if (candidates.length) return candidates[0]
  }

  if (preferFirstLine) return matchPercentage(source, {preferFirstLine: false})
  return null
}

export function findMinimumSpend(text) {
  return matchMoney(text, [
    'minimum\\s+transaksi',
    'minimal\\s+transaksi',
    'min(?:imum)?\\.?\\s*spend',
    'minimum\\s+pembelian',
    'minimal\\s+pembelian',
  ])
}

export function findMaximumMonetaryBenefit(text) {
  return matchMoney(text, [
    'maks(?:imum|imal)?\\s+(?:cashback|diskon|potongan|benefit)',
    'max(?:imum)?\\.?\\s+(?:cashback|discount|benefit)',
    '(?:cashback|diskon|potongan|discount)\\s+(?:hingga|up\\s+to)',
  ])
}

export function findFixedMonetaryBenefit(text) {
  const source = String(text || '')
  const offerLines = source.split('\n').filter((line) => /cashback|potongan|diskon|discount|voucher/i.test(line))
  return matchMoney(offerLines.join('\n'), [
    'cashback(?:\\s+instant)?(?:\\s+hingga)?',
    'potongan(?:\\s+hingga)?',
    'diskon(?:\\s+hingga)?',
    'discount(?:\\s+up\\s+to)?',
    'voucher(?:\\s+senilai)?',
  ], {maxDistance: 40})
}
