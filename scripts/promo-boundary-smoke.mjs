import assert from 'node:assert/strict'
import {applyTextBoundary} from '../lib/promo-sources/boundary.js'
import {findDateRange} from '../lib/promo-sources/date-parser.js'

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

console.log('Promo boundary and date smoke checks passed.')
