const preview={
 'kyc-autosave-astrapay':{
  en:'I redesigned KYC as resumable KTP and Selfie tasks, with visible progress and recovery states.',
  id:'Saya merancang KYC agar task KTP dan Selfie bisa dilanjutkan tanpa mengulang, dengan status progres yang jelas.'
 },
 'qris-topup-astrapay':{
  en:'I designed a one-time QR top-up journey for a channel ranked #3 by transaction count in 2026 YTD (10.61% share).',
  id:'Saya merancang alur top up QR sekali pakai untuk channel peringkat #3 berdasarkan transaksi 2026 YTD (share 10,61%).'
 },
 'ai-precheck-kyb':{
  en:'I turned AI mismatch findings into actionable, non-blocking warnings and correction paths inside a KYB web dashboard.',
  id:'Saya menerjemahkan finding AI menjadi warning non-blocking dan alur koreksi yang bisa ditindaklanjuti pada dashboard KYB.'
 },
 'ai-image-checking-kyb-astrapay':{
  en:'I consolidated multi-step Admin Web review into a single pass for eligible merchants, with deeper review for exceptions.',
  id:'Saya merangkum review bertahap di Admin Web menjadi satu pass untuk merchant eligible, dengan review tambahan untuk exception.'
 },
 'homepage-kyc-hook-astrapay':{
  en:'An A/B/C experiment on KYC messaging: stronger entry response for C, but no proven difference in final conversion.',
  id:'Eksperimen A/B/C pesan KYC: C lebih kuat pada entry, tetapi perbedaan final conversion belum terbukti.'
 },
 'testing-when-a-pedagogical-agent-actually-helps-learning':{
  en:'A 157-participant mixed-factorial study testing when a visible pedagogical agent improves different learning tasks.',
  id:'Studi mixed-factorial dengan 157 partisipan untuk menguji kapan pedagogical agent visual membantu berbagai jenis pembelajaran.'
 }
}
export function projectPreviewSummary(slug,lang,fallback=''){
 return preview[slug]?.[lang==='id'?'id':'en']||fallback
}
