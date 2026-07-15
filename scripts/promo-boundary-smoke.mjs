import assert from 'node:assert/strict'
import {applyTextBoundary} from '../lib/promo-sources/boundary.js'

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

console.log('Promo boundary smoke checks passed.')
