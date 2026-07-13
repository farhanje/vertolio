export const PROMO_CATEGORIES = [
  'food_dining',
  'groceries',
  'travel',
  'transportation',
  'shopping',
  'fashion',
  'electronics',
  'entertainment',
  'health_beauty',
  'bills_utilities',
  'financial_services',
  'education',
  'home_living',
  'automotive',
  'other',
]

const CATEGORY_RULES = [
  ['food_dining', /\b(restoran|restaurant|cafe|coffee|kopi|bakery|roti|pizza|burger|sushi|ramen|steak|makan(?:an)?|minum(?:an)?|kuliner|dining|food|beverage|f&b|starbucks|kfc|mcdonald(?:s)?|mcd|burger king|hokben|solaria|chatime|fore coffee|janji jiwa|kopi kenangan)\b/i],
  ['groceries', /\b(supermarket|minimarket|hypermarket|grocery|groceries|sembako|bahan makanan|fresh market|alfamart|indomaret|ranch market|farmers market)\b/i],
  ['travel', /\b(hotel|resort|villa|flight|penerbangan|airline|maskapai|travel|holiday|liburan|booking|tiket pesawat|akomodasi|staycation)\b/i],
  ['transportation', /\b(taksi|taxi|ride[- ]?hailing|transportasi|transportation|kereta|train|bus|mrt|lrt|commuter|tol|toll|parkir|parking|gojek|grab|bluebird)\b/i],
  ['fashion', /\b(fashion|apparel|clothing|pakaian|sepatu|shoes|sneaker|tas|bag|watch|jam tangan|jewelry|perhiasan)\b/i],
  ['electronics', /\b(electronic|electronics|gadget|smartphone|phone|laptop|computer|tablet|tv|television|camera|headphone|earphone|appliance)\b/i],
  ['entertainment', /\b(cinema|bioskop|movie|film|concert|konser|karaoke|theme park|waterpark|game|gaming|streaming|netflix|spotify|ticket event)\b/i],
  ['health_beauty', /\b(health|kesehatan|beauty|kecantikan|skincare|makeup|salon|spa|clinic|klinik|hospital|rumah sakit|pharmacy|apotek|wellness|gym|fitness)\b/i],
  ['bills_utilities', /\b(tagihan|bill payment|utilities|listrik|pln|air pdam|internet|wifi|telkom|pulsa|data package|paket data|postpaid|pascabayar)\b/i],
  ['financial_services', /\b(bank|banking|insurance|asuransi|investment|investasi|loan|pinjaman|credit|kredit|tabungan|deposito|reksa dana|saham)\b/i],
  ['education', /\b(education|pendidikan|school|sekolah|university|universitas|course|kursus|training|pelatihan|tuition|bimbel|bookstore|toko buku)\b/i],
  ['home_living', /\b(home living|home & living|furniture|mebel|interior|homeware|peralatan rumah|property|properti|renovasi|decor|dekorasi)\b/i],
  ['automotive', /\b(automotive|otomotif|mobil|motor|vehicle|kendaraan|service kendaraan|bengkel|ban|tire|car wash|cuci mobil|fuel|bensin|spbu)\b/i],
  ['shopping', /\b(shopping|belanja|marketplace|department store|mall|retail|store|toko|merchant|e-commerce|commerce)\b/i],
]

const CITY_ALIASES = [
  ['Jakarta', 'DKI Jakarta', ['jakarta', 'dki jakarta', 'jakarta pusat', 'jakarta selatan', 'jakarta utara', 'jakarta barat', 'jakarta timur']],
  ['Bogor', 'Jawa Barat', ['bogor']],
  ['Depok', 'Jawa Barat', ['depok']],
  ['Tangerang Selatan', 'Banten', ['tangerang selatan', 'tangsel']],
  ['Tangerang', 'Banten', ['tangerang']],
  ['Bekasi', 'Jawa Barat', ['bekasi']],
  ['Bandung', 'Jawa Barat', ['bandung']],
  ['Cirebon', 'Jawa Barat', ['cirebon']],
  ['Tasikmalaya', 'Jawa Barat', ['tasikmalaya']],
  ['Semarang', 'Jawa Tengah', ['semarang']],
  ['Surakarta', 'Jawa Tengah', ['surakarta', 'solo']],
  ['Purwokerto', 'Jawa Tengah', ['purwokerto']],
  ['Yogyakarta', 'DI Yogyakarta', ['yogyakarta', 'jogja', 'jogjakarta']],
  ['Surabaya', 'Jawa Timur', ['surabaya']],
  ['Malang', 'Jawa Timur', ['malang']],
  ['Sidoarjo', 'Jawa Timur', ['sidoarjo']],
  ['Gresik', 'Jawa Timur', ['gresik']],
  ['Denpasar', 'Bali', ['denpasar']],
  ['Mataram', 'Nusa Tenggara Barat', ['mataram']],
  ['Kupang', 'Nusa Tenggara Timur', ['kupang']],
  ['Medan', 'Sumatera Utara', ['medan']],
  ['Padang', 'Sumatera Barat', ['padang']],
  ['Pekanbaru', 'Riau', ['pekanbaru']],
  ['Batam', 'Kepulauan Riau', ['batam']],
  ['Palembang', 'Sumatera Selatan', ['palembang']],
  ['Bandar Lampung', 'Lampung', ['bandar lampung']],
  ['Pontianak', 'Kalimantan Barat', ['pontianak']],
  ['Banjarmasin', 'Kalimantan Selatan', ['banjarmasin']],
  ['Balikpapan', 'Kalimantan Timur', ['balikpapan']],
  ['Samarinda', 'Kalimantan Timur', ['samarinda']],
  ['Makassar', 'Sulawesi Selatan', ['makassar', 'ujung pandang']],
  ['Manado', 'Sulawesi Utara', ['manado']],
  ['Jayapura', 'Papua', ['jayapura']],
]

const PROVINCES = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau', 'Jambi', 'Sumatera Selatan',
  'Bangka Belitung', 'Bengkulu', 'Lampung', 'Banten', 'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah',
  'DI Yogyakarta', 'Jawa Timur', 'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Kalimantan Barat',
  'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara', 'Sulawesi Utara',
  'Gorontalo', 'Sulawesi Tengah', 'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tenggara', 'Maluku',
  'Maluku Utara', 'Papua', 'Papua Barat', 'Papua Selatan', 'Papua Tengah', 'Papua Pegunungan', 'Papua Barat Daya',
]

const LOCATION_SCOPES = ['nationwide', 'online', 'regional', 'city', 'outlet', 'unknown']
const OUTLET_CUES = /\b(outlet|cabang|branch|store|gerai|mall|plaza|hotel|restoran|restaurant|bandara|airport|terminal|stasiun|station|jalan|jl\.?|ruko|lobby|lantai|floor|unit)\b/i

function unique(values) {
  return [...new Set((values || []).filter(Boolean))]
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function explicitLocations(text) {
  const cities = []
  const provinces = []
  const normalized = normalizeText(text)

  if (/\bjabodetabek\b/i.test(normalized)) {
    cities.push('Jakarta', 'Bogor', 'Depok', 'Tangerang', 'Bekasi')
    provinces.push('DKI Jakarta', 'Jawa Barat', 'Banten')
  }

  for (const [city, province, aliases] of CITY_ALIASES) {
    if (aliases.some((alias) => new RegExp(`\\b${escapeRegex(alias)}\\b`, 'i').test(normalized))) {
      cities.push(city)
      provinces.push(province)
    }
  }

  for (const province of PROVINCES) {
    if (new RegExp(`\\b${escapeRegex(province)}\\b`, 'i').test(normalized)) provinces.push(province)
  }

  return { cities: unique(cities), provinces: unique(provinces) }
}

function inferCategories(text) {
  const scored = CATEGORY_RULES
    .map(([category, regex], index) => ({category, index, score: (String(text).match(new RegExp(regex.source, `${regex.flags.includes('g') ? regex.flags : `${regex.flags}g`}`)) || []).length}))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)

  const categories = unique(scored.map((item) => item.category))
  return {
    primaryCategory: categories[0] || 'other',
    categories: categories.length ? categories : ['other'],
  }
}

function inferTags(text) {
  const tags = []
  const value = normalizeText(text)
  if (/\b(online|website|web|aplikasi|app|e-commerce|marketplace)\b/i.test(value)) tags.push('online')
  if (/\b(offline|in-store|di outlet|di gerai|di cabang|merchant outlet)\b/i.test(value)) tags.push('offline')
  if (/\b(new user|pengguna baru|nasabah baru|pelanggan baru|first transaction|transaksi pertama)\b/i.test(value)) tags.push('new_user')
  if (/\b(existing user|pengguna lama|nasabah existing|pelanggan setia)\b/i.test(value)) tags.push('existing_user')
  if (/\b(sabtu|minggu|weekend)\b/i.test(value)) tags.push('weekend')
  if (/\b(senin|selasa|rabu|kamis|jumat|jum\'at|weekday)\b/i.test(value)) tags.push('weekday')
  if (/\b(qris)\b/i.test(value)) tags.push('qris')
  if (/\b(kartu kredit|credit card|debit card|kartu debit)\b/i.test(value)) tags.push('card')
  if (/\b(e-wallet|ewallet|dompet digital)\b/i.test(value)) tags.push('ewallet')
  if (/\b(kode promo|kode voucher|promo code|voucher code)\b/i.test(value)) tags.push('voucher_code')
  if (/\b(seluruh indonesia|se-indonesia|nasional|nationwide|semua outlet|seluruh outlet)\b/i.test(value)) tags.push('nationwide')
  return unique(tags)
}

function inferOutlets(text) {
  const fragments = String(text || '')
    .replace(/[•|]/g, '\n')
    .split(/\n|(?<=[.;])\s+/)
    .map((item) => normalizeText(item))
    .filter((item) => item.length >= 8 && item.length <= 260 && OUTLET_CUES.test(item))

  const outlets = []
  for (const fragment of fragments) {
    const locations = explicitLocations(fragment)
    if (!locations.cities.length && !/\b(jalan|jl\.?|mall|plaza|ruko|lantai|floor|unit|bandara|airport)\b/i.test(fragment)) continue

    let outletName = fragment
      .replace(/^(berlaku|tersedia|khusus|hanya|lokasi|outlet|cabang)\s*(di|:|-)?\s*/i, '')
      .split(/\s[-–—]\s|,\s*(?:Jl\.?|Jalan)\b/i)[0]
      .trim()
      .slice(0, 120)

    if (!outletName || outletName.length < 3) outletName = fragment.slice(0, 120)
    outlets.push({
      outletName,
      address: /\b(jalan|jl\.?|ruko|lantai|floor|unit)\b/i.test(fragment) ? fragment : null,
      city: locations.cities[0] || null,
      province: locations.provinces[0] || null,
      postalCode: fragment.match(/\b\d{5}\b/)?.[0] || null,
      sourceText: fragment,
    })
  }

  const seen = new Set()
  return outlets.filter((outlet) => {
    const key = `${outlet.outletName}|${outlet.address || ''}|${outlet.city || ''}`.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 100)
}

function inferLocationScope(text, cities, provinces, outlets) {
  if (outlets.length) return 'outlet'
  if (/\b(seluruh indonesia|se-indonesia|nasional|nationwide|semua outlet|seluruh outlet)\b/i.test(text)) return 'nationwide'
  if (/\b(online only|khusus online|hanya di aplikasi|app only|website only)\b/i.test(text)) return 'online'
  if (cities.length) return 'city'
  if (provinces.length) return 'regional'
  return 'unknown'
}

function deterministicSegmentation(extracted) {
  const fields = extracted?.extractedFields || {}
  const text = [fields.title, fields.merchant, fields.provider, fields.termsText, extracted?.rawRelevantText]
    .filter(Boolean)
    .join(' ')
    .slice(0, 30000)
  const categories = inferCategories(text)
  const locations = explicitLocations(text)
  const outlets = inferOutlets(extracted?.rawRelevantText || fields.termsText || '')
  const cities = unique([...locations.cities, ...outlets.map((item) => item.city)])
  const provinces = unique([...locations.provinces, ...outlets.map((item) => item.province)])
  const locationScope = inferLocationScope(text, cities, provinces, outlets)
  const tags = inferTags(text)
  if (locationScope === 'outlet') tags.push('specific_outlet')

  return {
    primaryCategory: categories.primaryCategory,
    categories: categories.categories,
    tags: unique(tags),
    locationScope,
    cities,
    provinces,
    outlets,
    segmentationMethod: 'rules',
    segmentationConfidence: categories.primaryCategory === 'other' ? 0.45 : 0.72,
  }
}

function parseResponseText(response) {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) return response.output_text
  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') return content.text
    }
  }
  return null
}

function sanitizeLlmResult(value) {
  if (!value || typeof value !== 'object') return null
  const categories = unique((value.categories || []).filter((item) => PROMO_CATEGORIES.includes(item)))
  const primaryCategory = PROMO_CATEGORIES.includes(value.primaryCategory)
    ? value.primaryCategory
    : categories[0] || 'other'
  if (!categories.includes(primaryCategory)) categories.unshift(primaryCategory)

  const locationScope = LOCATION_SCOPES.includes(value.locationScope) ? value.locationScope : 'unknown'
  const outlets = (Array.isArray(value.outlets) ? value.outlets : []).map((item) => ({
    outletName: normalizeText(item?.outletName).slice(0, 160),
    address: normalizeText(item?.address) || null,
    city: normalizeText(item?.city) || null,
    province: normalizeText(item?.province) || null,
    postalCode: normalizeText(item?.postalCode) || null,
    sourceText: normalizeText(item?.sourceText).slice(0, 500),
  })).filter((item) => item.outletName && item.sourceText).slice(0, 150)

  return {
    primaryCategory,
    categories: categories.length ? categories : ['other'],
    tags: unique((value.tags || []).map(normalizeText)).slice(0, 30),
    locationScope,
    cities: unique((value.cities || []).map(normalizeText)).slice(0, 100),
    provinces: unique((value.provinces || []).map(normalizeText)).slice(0, 50),
    outlets,
    segmentationConfidence: Math.max(0, Math.min(Number(value.confidence || 0.7), 1)),
  }
}

async function llmSegmentation(extracted) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const fields = extracted?.extractedFields || {}
  const sourceText = normalizeText(extracted?.rawRelevantText || fields.termsText).slice(0, 12000)
  if (!sourceText) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.PROMO_LLM_MODEL || 'gpt-5.6-luna',
        reasoning: {effort: 'low'},
        max_output_tokens: 1800,
        instructions: [
          'You classify Indonesian promotions into a strict taxonomy and extract explicit geographic coverage.',
          'Infer categories from the merchant and offer, but never invent a city, province, branch, or outlet.',
          'Only include cities, provinces, and outlets explicitly present in the supplied source text.',
          'Atomic outlet means one named physical branch or venue per array item. Generic phrases such as all outlets are not outlet rows.',
          'Use locationScope nationwide for explicit national or all-outlet coverage, online for online-only, outlet for named branches, city for named cities, regional for named provinces, otherwise unknown.',
          'Do not calculate discount value and do not rewrite financial terms.',
        ].join(' '),
        input: JSON.stringify({
          title: fields.title || null,
          merchant: fields.merchant || null,
          provider: fields.provider || null,
          channels: fields.channels || [],
          sourceText,
        }),
        text: {
          verbosity: 'low',
          format: {
            type: 'json_schema',
            name: 'promo_segmentation',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['primaryCategory', 'categories', 'tags', 'locationScope', 'cities', 'provinces', 'outlets', 'confidence'],
              properties: {
                primaryCategory: {type: 'string', enum: PROMO_CATEGORIES},
                categories: {type: 'array', items: {type: 'string', enum: PROMO_CATEGORIES}, maxItems: 6},
                tags: {type: 'array', items: {type: 'string'}, maxItems: 20},
                locationScope: {type: 'string', enum: LOCATION_SCOPES},
                cities: {type: 'array', items: {type: 'string'}, maxItems: 100},
                provinces: {type: 'array', items: {type: 'string'}, maxItems: 50},
                outlets: {
                  type: 'array',
                  maxItems: 150,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['outletName', 'address', 'city', 'province', 'postalCode', 'sourceText'],
                    properties: {
                      outletName: {type: 'string'},
                      address: {type: 'string'},
                      city: {type: 'string'},
                      province: {type: 'string'},
                      postalCode: {type: 'string'},
                      sourceText: {type: 'string'},
                    },
                  },
                },
                confidence: {type: 'number', minimum: 0, maximum: 1},
              },
            },
          },
        },
      }),
    })

    if (!response.ok) return null
    const data = await response.json()
    const text = parseResponseText(data)
    if (!text) return null
    return sanitizeLlmResult(JSON.parse(text))
  } catch (_) {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function mergeOutlets(primary, fallback) {
  const seen = new Set()
  const result = []
  for (const outlet of [...(primary || []), ...(fallback || [])]) {
    const key = `${outlet.outletName}|${outlet.address || ''}|${outlet.city || ''}`.toLowerCase()
    if (!outlet.outletName || seen.has(key)) continue
    seen.add(key)
    result.push(outlet)
  }
  return result.slice(0, 150)
}

export async function enrichExtractedPromotion(extracted) {
  const deterministic = deterministicSegmentation(extracted)
  const llm = await llmSegmentation(extracted)
  const fields = extracted?.extractedFields || {}
  const merged = llm ? {
    primaryCategory: llm.primaryCategory,
    categories: unique([...llm.categories, ...deterministic.categories]),
    tags: unique([...llm.tags, ...deterministic.tags]),
    locationScope: llm.locationScope !== 'unknown' ? llm.locationScope : deterministic.locationScope,
    cities: unique([...llm.cities, ...deterministic.cities]),
    provinces: unique([...llm.provinces, ...deterministic.provinces]),
    outlets: mergeOutlets(llm.outlets, deterministic.outlets),
    segmentationMethod: 'llm_hybrid',
    segmentationConfidence: llm.segmentationConfidence,
  } : deterministic

  return {
    ...extracted,
    extractedFields: {
      ...fields,
      ...merged,
    },
  }
}
