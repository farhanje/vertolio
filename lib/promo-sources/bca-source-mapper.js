import {createHash} from 'node:crypto'
import {findFixedMonetaryBenefit, findMaximumMonetaryBenefit, findMinimumSpend, matchPercentage} from './money-parser.js'

function sha256Hex(value) {
  return createHash('sha256').update(String(value || '')).digest('hex')
}

export const BCA_SOURCE_MAPPER_VERSION = 'bca-source-map-v2'

const CATEGORY_MAP = new Map([
  ['food and beverages', 'food_dining'],
  ['food & beverages', 'food_dining'],
  ['groceries', 'groceries'],
  ['travel and leisure', 'travel'],
  ['travel & leisure', 'travel'],
  ['transportation', 'transportation'],
  ['fashion & shopping', 'fashion'],
  ['fashion and shopping', 'fashion'],
  ['electronics', 'electronics'],
  ['entertainment', 'entertainment'],
  ['hobby', 'entertainment'],
  ['health & beauty', 'health_beauty'],
  ['health and beauty', 'health_beauty'],
  ['telco', 'bills_utilities'],
  ['education', 'education'],
  ['automotive', 'automotive'],
  ['home & living', 'home_living'],
  ['others', 'other'],
])

const PAYMENT_METHODS = [
  ['QRIS', /\bqris\b/i],
  ['myBCA', /\bmybca\b/i],
  ['BCA mobile', /\bbca\s+mobile\b/i],
  ['Virtual Account BCA', /\bvirtual\s+account(?:\s+bca)?\b/i],
  ['KlikBCA', /\bklikbca\b/i],
  ['ATM BCA', /\batm\s+bca\b/i],
  ['Kartu Kredit BCA', /kartu\s+kredit\s+bca/i],
  ['Kartu Debit BCA', /kartu\s+debit\s+bca|debit\s+bca/i],
  ['Sakuku', /\bsakuku\b/i],
  ['Paylater BCA', /\bpaylater(?:\s+bca)?\b/i],
  ['Reward BCA', /\breward\s+bca\b/i],
  ['NFC Pay', /\bnfc\s+pay\b/i],
]

const CITY_PROVINCE = [
  ['Jakarta', 'DKI Jakarta', /\bjakarta(?:\s+(?:pusat|selatan|utara|barat|timur))?\b/i],
  ['Bogor', 'Jawa Barat', /\bbogor\b/i],
  ['Depok', 'Jawa Barat', /\bdepok\b/i],
  ['Tangerang Selatan', 'Banten', /\b(?:tangerang\s+selatan|tangsel)\b/i],
  ['Tangerang', 'Banten', /\btangerang\b/i],
  ['Bekasi', 'Jawa Barat', /\bbekasi\b/i],
  ['Bandung', 'Jawa Barat', /\bbandung\b/i],
  ['Semarang', 'Jawa Tengah', /\bsemarang\b/i],
  ['Yogyakarta', 'DI Yogyakarta', /\b(?:yogyakarta|jogja|jogjakarta)\b/i],
  ['Surabaya', 'Jawa Timur', /\bsurabaya\b/i],
  ['Malang', 'Jawa Timur', /\bmalang\b/i],
  ['Denpasar', 'Bali', /\bdenpasar\b/i],
  ['Medan', 'Sumatera Utara', /\bmedan\b/i],
  ['Pekanbaru', 'Riau', /\bpekanbaru\b/i],
  ['Batam', 'Kepulauan Riau', /\bbatam\b/i],
  ['Palembang', 'Sumatera Selatan', /\bpalembang\b/i],
  ['Jambi', 'Jambi', /\bjambi\b/i],
  ['Pontianak', 'Kalimantan Barat', /\bpontianak\b/i],
  ['Banjarmasin', 'Kalimantan Selatan', /\bbanjarmasin\b/i],
  ['Balikpapan', 'Kalimantan Timur', /\bbalikpapan\b/i],
  ['Samarinda', 'Kalimantan Timur', /\bsamarinda\b/i],
  ['Makassar', 'Sulawesi Selatan', /\bmakassar\b/i],
  ['Manado', 'Sulawesi Utara', /\bmanado\b/i],
]

function normalizedLines(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))]
}

function indexOfLine(lines, pattern, start = 0) {
  for (let index = start; index < lines.length; index += 1) {
    if (pattern.test(lines[index])) return index
  }
  return -1
}

function section(lines, startPattern, endPatterns = []) {
  const start = indexOfLine(lines, startPattern)
  if (start < 0) return []
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (endPatterns.some((pattern) => pattern.test(lines[index]))) {
      end = index
      break
    }
  }
  return lines.slice(start + 1, end)
}

function sourceCategory(lines) {
  const index = lines.findIndex((line) => /^Promo BCA$/i.test(line))
  const label = index >= 0 ? String(lines[index + 1] || '').toLowerCase() : ''
  const primaryCategory = CATEGORY_MAP.get(label) || null
  return primaryCategory ? {primaryCategory, categories: [primaryCategory], sourceCategoryLabel: lines[index + 1]} : null
}

function paymentMethods(lines) {
  const userLines = section(lines, /^Bagi Pengguna$/i, [
    /^Syarat/i,
    /^(?:Dapatkan|Diskon|Cashback|Potongan|Hemat|Harga|Tambahan|Penawaran)/i,
  ])
  const evidence = userLines.join(' ')
  return PAYMENT_METHODS.filter(([, pattern]) => pattern.test(evidence)).map(([label]) => label)
}

function cityProvinceFromText(text) {
  const cities = []
  const provinces = []
  for (const [city, province, pattern] of CITY_PROVINCE) {
    if (city === 'Tangerang' && /\btangerang\s+selatan\b/i.test(text)) continue
    if (pattern.test(text)) {
      cities.push(city)
      provinces.push(province)
    }
  }
  return {cities: unique(cities), provinces: unique(provinces)}
}

function locationEvidence(lines) {
  const summary = lines.filter((line) => (
    /^(?:berlaku|tersedia|khusus|hanya)\s+di\b/i.test(line)
    || /\bkeberangkatan\s+dari\b/i.test(line)
    || /\bseluruh\s+outlet\b/i.test(line)
  ))
  const locationLines = section(lines, /^Lokasi\s*:?$/i, [
    /^Ajukan/i,
    /^Download/i,
    /^Periode promo/i,
    /^Bagikan promo/i,
  ])
  const evidenceLines = summary.length ? summary : locationLines
  return {summary, locationLines, evidenceLines}
}

function addressLike(line) {
  return /\b(?:jl\.?|jalan|ruko|mall|plaza|kav(?:ling)?\.?|lantai|floor|unit|no\.?\s*\d|bandara|terminal)\b/i.test(line)
}

function outletsFromLocationLines(locationLines, merchant) {
  const outlets = []
  for (let index = 0; index < locationLines.length; index += 1) {
    const line = locationLines[index]
    if (!addressLike(line)) continue
    const previous = locationLines[index - 1] || ''
    const outletName = previous && !addressLike(previous) && previous.length <= 120
      ? previous
      : merchant
    const location = cityProvinceFromText(line)
    outlets.push({
      outletName: outletName || merchant || 'Merchant outlet',
      address: line,
      city: location.cities[0] || null,
      province: location.provinces[0] || null,
      postalCode: line.match(/\b\d{5}\b/)?.[0] || null,
      sourceText: previous && outletName === previous ? `${previous} ${line}` : line,
    })
  }

  const seen = new Set()
  return outlets.filter((outlet) => {
    const key = `${outlet.outletName}|${outlet.address}`.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 100)
}

function availability(lines, merchant) {
  const evidence = locationEvidence(lines)
  const evidenceText = evidence.evidenceLines.join(' ')
  const allText = lines.join(' ')
  const locations = cityProvinceFromText(evidenceText)
  const outlets = outletsFromLocationLines(evidence.locationLines, merchant)
  const channels = []

  if (/\bofficial\s+website|\bwebsite\b|\bsitus\b/i.test(allText)) channels.push('website', 'online')
  if (/\bpembelian[^.]{0,80}\b(?:melalui|di)\s+myBCA\b/i.test(allText)) channels.push('in_app', 'online')
  if (outlets.length || evidence.locationLines.length || /\bberlaku\s+di\b/i.test(evidenceText)) channels.push('merchant_outlet', 'offline')

  let locationScope = 'unknown'
  if (/\bseluruh\s+outlet|\bsemua\s+outlet/i.test(evidenceText)) locationScope = 'nationwide'
  else if (outlets.length || evidence.locationLines.length) locationScope = 'outlet'
  else if (locations.cities.length) locationScope = 'city'
  else if (channels.includes('online')) locationScope = 'online'

  return {
    locationScope,
    cities: locations.cities,
    provinces: locations.provinces,
    outlets,
    channels: unique(channels),
    locationEvidence: evidenceText,
  }
}

function benefitFields(text, title) {
  const titleAndOffer = normalizedLines(text).slice(0, 12).join('\n')
  const percentage = matchPercentage(titleAndOffer)
  const fixedBenefit = findFixedMonetaryBenefit(titleAndOffer)
  const maximumBenefit = findMaximumMonetaryBenefit(text)
  const minimumSpend = findMinimumSpend(text)
  const offerIsCashback = /cashback/i.test(title)

  return {
    minimumSpend,
    benefitType: percentage
      ? 'percentage'
      : fixedBenefit
        ? (offerIsCashback ? 'cashback_fixed' : 'discount_fixed')
        : null,
    benefitValue: percentage || fixedBenefit || null,
    maximumBenefit,
  }
}

export function mapBcaPromotionFields(extracted) {
  const fields = extracted.extractedFields || {}
  const text = extracted.rawRelevantText || fields.termsText || ''
  const lines = normalizedLines(text)
  const title = fields.title || ''
  const merchant = title.includes(' - ') ? title.split(' - ')[0].trim() : fields.merchant || null
  const category = sourceCategory(lines)
  const mappedAvailability = availability(lines, merchant)
  const mappedBenefit = benefitFields(text, title)
  const methods = paymentMethods(lines)

  const mappedFields = {
    ...fields,
    merchant,
    provider: 'BCA',
    paymentMethods: methods,
    minimumSpend: mappedBenefit.minimumSpend,
    benefitType: mappedBenefit.benefitType,
    benefitValue: mappedBenefit.benefitValue,
    maximumBenefit: mappedBenefit.maximumBenefit,
    channels: mappedAvailability.channels,
    locationScope: mappedAvailability.locationScope,
    cities: mappedAvailability.cities,
    provinces: mappedAvailability.provinces,
    outlets: mappedAvailability.outlets,
    sourceMappingAuthority: 'source_adapter',
    sourceMappingVersion: BCA_SOURCE_MAPPER_VERSION,
    sourceCategoryLabel: category?.sourceCategoryLabel || null,
    ...(category || {}),
  }

  return {
    fields: mappedFields,
    contentHash: sha256Hex(`${extracted.contentHash}|${BCA_SOURCE_MAPPER_VERSION}|${JSON.stringify({
      category: category?.primaryCategory || null,
      paymentMethods: methods,
      minimumSpend: mappedBenefit.minimumSpend,
      benefitType: mappedBenefit.benefitType,
      benefitValue: mappedBenefit.benefitValue,
      maximumBenefit: mappedBenefit.maximumBenefit,
      locationScope: mappedAvailability.locationScope,
      cities: mappedAvailability.cities,
      provinces: mappedAvailability.provinces,
      channels: mappedAvailability.channels,
      outlets: mappedAvailability.outlets,
    })}`),
    diagnostics: {
      sourceMappingVersion: BCA_SOURCE_MAPPER_VERSION,
      sourceCategoryLabel: category?.sourceCategoryLabel || null,
      locationEvidence: mappedAvailability.locationEvidence,
      paymentMethods: methods,
    },
  }
}
