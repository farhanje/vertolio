import assert from 'node:assert/strict'
import {applyTextBoundary} from '../lib/promo-sources/boundary.js'
import {findDateRange} from '../lib/promo-sources/date-parser.js'
import {findFixedMonetaryBenefit, findMaximumMonetaryBenefit, findMinimumSpend} from '../lib/promo-sources/money-parser.js'
import {mapBcaPromotionFields} from '../lib/promo-sources/bca-source-mapper.js'
import {mapDanaPromotionFields} from '../lib/promo-sources/dana-source-mapper.js'

const toastBoxPage = `
Home
Promo BCA
ToastBox - Dapatkan Ekstra Toast
Berlaku Hingga 23 Jul 2026
Bagi Pengguna
Kartu Kredit BCA Kartu Debit BCA
Dapatkan Ekstra Toast
Syarat & Ketentuan:
Minimum transaksi Rp120 ribu
Berlaku untuk pilihan: Toast Peanut Butter / THK Condesed Milk / Butter Sugar Toast
Berlaku di ToastBox Lippo Mall Puri
Periode promo hingga 23 Jul 2026
Bagikan promo ini
Promo Serupa
Starbucks - Dapatkan Reward Diskon 30%
Berlaku Hingga 31 Jul 2026
`

const bounded = applyTextBoundary(toastBoxPage, {
  startMarkers: ['ToastBox - Dapatkan Ekstra Toast'],
  endMarkers: [/^Bagikan promo ini$/i, /^Promo Serupa$/i],
  requireStart: true,
  requireEnd: true,
  maxChars: 18000,
})

assert.equal(bounded.diagnostics.status, 'bounded')
assert.equal(bounded.diagnostics.startSatisfied, true)
assert.equal(bounded.diagnostics.endSatisfied, true)
assert.match(bounded.text, /ToastBox Lippo Mall Puri/)
assert.match(bounded.text, /23 Jul 2026/)
assert.doesNotMatch(bounded.text, /Starbucks/)
assert.doesNotMatch(bounded.text, /31 Jul 2026/)
assert.doesNotMatch(bounded.text, /Promo Serupa/)

const toastBoxDates = findDateRange(bounded.text)
assert.equal(toastBoxDates.startsAt, null)
assert.equal(toastBoxDates.expiresAt?.slice(0, 10), '2026-07-23')
assert.equal(toastBoxDates.strategy, 'labeled_dates')

const explicitRange = findDateRange('Periode promo 15 Jul 2026 - 31 Jul 2026')
assert.equal(explicitRange.startsAt?.slice(0, 10), '2026-07-15')
assert.equal(explicitRange.expiresAt?.slice(0, 10), '2026-07-31')
assert.equal(explicitRange.strategy, 'explicit_range')

const sharedMonthRange = findDateRange('Periode promo 15-31 Jul 2026')
assert.equal(sharedMonthRange.startsAt?.slice(0, 10), '2026-07-15')
assert.equal(sharedMonthRange.expiresAt?.slice(0, 10), '2026-07-31')

const publicationOnly = findDateRange('Diterbitkan 13 Jul 2026')
assert.equal(publicationOnly.startsAt, null)
assert.equal(publicationOnly.expiresAt, null)

const impossibleRange = findDateRange('Mulai 31 Jul 2026\nBerlaku Hingga 23 Jul 2026')
assert.equal(impossibleRange.startsAt, null)
assert.equal(impossibleRange.expiresAt?.slice(0, 10), '2026-07-23')
assert.deepEqual(impossibleRange.anomalies, ['start_after_expiry_cleared'])

const sourceTypoRange = findDateRange(`
Periode 31 Jul 2025 - 09 Agu 2026
Week 1 : 31 Juli - 2 Agustus 2026
Week 2 : 7 - 9 Agustus 2026
`)
assert.equal(sourceTypoRange.startsAt?.slice(0, 10), '2026-07-31')
assert.equal(sourceTypoRange.expiresAt?.slice(0, 10), '2026-08-09')
assert.equal(sourceTypoRange.strategy, 'detailed_ranges_repaired')

const vcGamersText = `
VCGamers - Cashback Hingga Rp50 Ribu Saldo Point
Minimum Pembelian
Rp25.000
Kuota Harian
100 Transaksi
`
assert.equal(findMinimumSpend(vcGamersText), 25000)
assert.equal(findMaximumMonetaryBenefit(vcGamersText), 50000)

const im3Text = `
IM3 - Potongan Harga Paket Roaming IM3 di myBCA
Tanggal
Paket Data
Harga Promo
Rp90.000
Harga Normal
Rp100.000
`
assert.equal(findFixedMonetaryBenefit(im3Text), null)

const optikText = `
Optik Seis - Tambahan Diskon 5%
Diskon hingga 30% + 5% untuk pembelian sunglasses atau frame
`
assert.equal(findMaximumMonetaryBenefit(optikText), null)

const mappedBca = mapBcaPromotionFields({
  contentHash: 'fixture',
  rawRelevantText: `
Zam Zam Sraten - Dapatkan Minyak Goreng 1 Liter
Home
Promo BCA
Groceries
Zam Zam Sraten
Zam Zam Sraten - Dapatkan Minyak Goreng 1 Liter
Periode 14 Jul 2026 - 30 Sep 2026
Bagi Pengguna
myBCA BCA mobile QRIS Sakuku Kartu Kredit BCA
Dapatkan Minyak Goreng 1 Liter
Syarat & Ketentuan:
Minimum transaksi Rp500 ribu
Lokasi :
Jl. Raya Sraten 001/001
`,
  extractedFields: {
    title: 'Zam Zam Sraten - Dapatkan Minyak Goreng 1 Liter',
    termsText: '',
  },
})
assert.equal(mappedBca.fields.primaryCategory, 'groceries')
assert.equal(mappedBca.fields.minimumSpend, 500000)
assert.equal(mappedBca.fields.benefitType, null)
assert.equal(mappedBca.fields.locationScope, 'outlet')
assert.deepEqual(mappedBca.fields.paymentMethods, ['QRIS', 'myBCA', 'BCA mobile', 'Kartu Kredit BCA', 'Sakuku'])

const danaTitle = 'Serbu promo Rp10k with DANA QRIS di Es Teler 77!'
const danaDetailPage = `
${danaTitle}
Syarat & Ketentuan:
1. Promo berjalan dari tanggal 29 Juni 2026 – 31 Desember 2026
2. Promo cashback berlaku bagi pengguna DANA yang bertransaksi menggunakan DANA QRIS di semua outlet Es Teler di Indonesia.
3. Pengguna akan mendapatkan promo cashback 10% maksimum IDR 10.000 untuk KYC user dan cashback 5% maksimum IDR 10.000 untuk Non KYC user
4. Pengguna dapat mendapatkan cashback dengan belanja minimum transaksi IDR80.000
5. Promo berlaku buat pengguna berbayar memakai saldo DANA
6. Kuota promo terbatas per harinya
Lihat Info Selengkapnya
Transaksi #BEBASDRAMA Sekarang!
Download DANA Sekarang
`

const boundedDana = applyTextBoundary(danaDetailPage, {
  startMarkers: [danaTitle],
  endMarkers: [/^Lihat Info Selengkapnya$/i, /^Transaksi #?BEBASDRAMA Sekarang!?$/i],
  requireStart: true,
  requireEnd: true,
  maxChars: 20000,
})
assert.equal(boundedDana.diagnostics.status, 'bounded')
assert.match(boundedDana.text, /minimum transaksi IDR80\.000/)
assert.doesNotMatch(boundedDana.text, /Download DANA/)

const danaDates = findDateRange(boundedDana.text)
assert.equal(danaDates.startsAt?.slice(0, 10), '2026-06-29')
assert.equal(danaDates.expiresAt?.slice(0, 10), '2026-12-31')
assert.equal(findMinimumSpend(boundedDana.text), 80000)

const mappedDana = mapDanaPromotionFields({
  contentHash: 'dana-fixture',
  rawRelevantText: boundedDana.text,
  sourceHint: {
    title: danaTitle,
    listingExpiresAt: '2026-12-31T00:00:00.000Z',
  },
  extractedFields: {
    title: danaTitle,
    startsAt: danaDates.startsAt,
    expiresAt: danaDates.expiresAt,
    termsText: boundedDana.text,
  },
})
assert.equal(mappedDana.fields.merchant, 'Es Teler 77')
assert.equal(mappedDana.fields.primaryCategory, 'food_dining')
assert.equal(mappedDana.fields.minimumSpend, 80000)
assert.equal(mappedDana.fields.benefitType, 'percentage')
assert.equal(mappedDana.fields.benefitValue, 10)
assert.equal(mappedDana.fields.maximumBenefit, 10000)
assert.equal(mappedDana.fields.locationScope, 'nationwide')
assert.deepEqual(mappedDana.fields.paymentMethods, ['DANA QRIS', 'Saldo DANA'])
assert.equal(mappedDana.diagnostics.listingDetailExpiryMismatch, false)
assert.match(mappedDana.fields.quotaText, /Kuota promo terbatas/i)

const conflictingDana = mapDanaPromotionFields({
  contentHash: 'dana-conflict',
  rawRelevantText: boundedDana.text,
  sourceHint: {
    title: danaTitle,
    listingExpiresAt: '2026-09-30T00:00:00.000Z',
  },
  extractedFields: {
    title: danaTitle,
    startsAt: danaDates.startsAt,
    expiresAt: danaDates.expiresAt,
    termsText: boundedDana.text,
  },
})
assert.equal(conflictingDana.fields.expiresAt.slice(0, 10), '2026-12-31')
assert.equal(conflictingDana.diagnostics.listingDetailExpiryMismatch, true)
assert.equal(conflictingDana.fields.contradictions.length, 1)

const missingEnd = applyTextBoundary('Promo A\nDiskon 20%', {
  startMarkers: ['Promo A'],
  endMarkers: ['Related offers'],
  requireStart: true,
  requireEnd: true,
})
assert.equal(missingEnd.diagnostics.status, 'unconfirmed')
assert.equal(missingEnd.diagnostics.endSatisfied, false)

const generic = applyTextBoundary('Merchant\nDiskon 10%\nOnline')
assert.equal(generic.diagnostics.status, 'generic')
assert.match(generic.text, /Diskon 10%/)

console.log('Promo boundary, date, money, BCA, and DANA source mapping smoke checks passed.')
