const blue = '#1557E8'
const muted = '#666666'
const line = '#E4E4E4'

function svgUrl(body, height = 654) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="${height}" viewBox="0 0 360 ${height}">
    <rect width="360" height="${height}" fill="#fff"/>
    <style>
      text{font-family:Arial,Helvetica,sans-serif;fill:#222}
      .small{font-size:11px}.body{font-size:13px}.title{font-size:19px;font-weight:700}.bold{font-weight:700}.muted{fill:${muted}}
    </style>
    <text x="24" y="21" class="small bold">08:34</text>
    <text x="286" y="21" class="small">▮▮▮ 4G ▰</text>
    ${body}
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function appBar(title) {
  return `<text x="24" y="67" font-size="28">‹</text><text x="72" y="67" class="title">${title}</text><line x1="0" y1="90" x2="360" y2="90" stroke="${line}"/>`
}

function button(label, y = 570, fill = blue) {
  return `<rect x="24" y="${y}" width="312" height="44" rx="9" fill="${fill}"/><text x="180" y="${y + 28}" text-anchor="middle" class="body bold" fill="#fff" style="fill:#fff">${label}</text>`
}

function choiceCard(y, title, desc) {
  return `<rect x="24" y="${y}" width="312" height="88" rx="12" fill="#F7F8FA" stroke="#E2E5EA"/>
    <text x="44" y="${y + 31}" class="body bold">${title}</text>
    <text x="44" y="${y + 55}" class="small muted">${desc}</text>
    <text x="314" y="${y + 48}" font-size="24" fill="#777">›</text>`
}

const screens = {
  choose: svgUrl(`${appBar('Verifikasi Identitas')}
    <text x="24" y="132" class="title">Pilih dokumen</text>
    <text x="24" y="157" class="body muted">Gunakan dokumen identitas yang tersedia.</text>
    ${choiceCard(195, 'KTP', 'Kartu Tanda Penduduk')}
    ${choiceCard(299, 'SIM', 'Surat Izin Mengemudi')}
    <rect x="24" y="421" width="312" height="84" rx="12" fill="#EEF3FF"/>
    <text x="44" y="451" class="body bold">Satu OCR contract</text>
    <text x="44" y="474" class="small muted">Jenis dokumen boleh berbeda.</text>
    <text x="44" y="494" class="small muted">Output ke aplikasi tetap konsisten.</text>`),
  ktp: svgUrl(`${appBar('Foto KTP')}
    <rect x="34" y="155" width="292" height="184" rx="14" fill="#F4F5F7" stroke="#C8CDD5" stroke-dasharray="7 7"/>
    <rect x="76" y="196" width="208" height="112" rx="8" fill="#E2E7EF"/>
    <text x="180" y="254" text-anchor="middle" class="body bold">KTP di dalam frame</text>
    <text x="180" y="374" text-anchor="middle" class="body muted">Pastikan tulisan terlihat jelas.</text>
    ${button('Ambil Foto')}`),
  sim: svgUrl(`${appBar('Foto SIM')}
    <rect x="34" y="155" width="292" height="184" rx="14" fill="#F4F5F7" stroke="#C8CDD5" stroke-dasharray="7 7"/>
    <rect x="86" y="188" width="188" height="126" rx="10" fill="#E2E7EF"/>
    <text x="180" y="254" text-anchor="middle" class="body bold">SIM di dalam frame</text>
    <text x="180" y="374" text-anchor="middle" class="body muted">Dokumen berbeda, flow tetap sama.</text>
    ${button('Ambil Foto')}`),
  processing: svgUrl(`${appBar('Membaca Dokumen')}
    <circle cx="180" cy="232" r="52" fill="#EEF3FF"/>
    <path d="M154 232a26 26 0 1 1 8 19" fill="none" stroke="${blue}" stroke-width="7" stroke-linecap="round"/>
    <path d="M150 237l4-17 16 9" fill="${blue}"/>
    <text x="180" y="319" text-anchor="middle" class="title">Sedang membaca data</text>
    <text x="180" y="347" text-anchor="middle" class="body muted">Data identitas akan diisi otomatis.</text>
    <rect x="24" y="411" width="312" height="92" rx="12" fill="#F7F8FA"/>
    <text x="44" y="443" class="body bold">Vertex AI</text>
    <text x="44" y="466" class="small muted">Membaca dokumen lalu mengembalikan</text>
    <text x="44" y="486" class="small muted">response terstruktur ke KYC.</text>`),
  review: svgUrl(`${appBar('Data Diri')}
    <text x="24" y="127" class="small muted">NAMA LENGKAP</text>
    <rect x="24" y="140" width="312" height="46" rx="8" fill="#F7F8FA"/><text x="40" y="169" class="body">Budi Santoso</text>
    <text x="24" y="222" class="small muted">NIK / NOMOR IDENTITAS</text>
    <rect x="24" y="235" width="312" height="46" rx="8" fill="#F7F8FA"/><text x="40" y="264" class="body">3174••••••••0012</text>
    <text x="24" y="317" class="small muted">TEMPAT, TANGGAL LAHIR</text>
    <rect x="24" y="330" width="312" height="46" rx="8" fill="#F7F8FA"/><text x="40" y="359" class="body">Jakarta, 12 Mei 1994</text>
    <rect x="24" y="418" width="312" height="70" rx="10" fill="#EEF3FF"/>
    <text x="44" y="447" class="body bold">Periksa sebelum lanjut</text>
    <text x="44" y="470" class="small muted">Koreksi data jika hasil OCR belum sesuai.</text>
    ${button('Lanjutkan')}`),
  edit: svgUrl(`${appBar('Perbaiki Data')}
    <text x="24" y="132" class="body bold">Tempat lahir</text>
    <rect x="24" y="151" width="312" height="48" rx="8" fill="#fff" stroke="${blue}" stroke-width="2"/><text x="40" y="181" class="body">Jakarta Selatan</text>
    <text x="24" y="235" class="body bold">Tanggal lahir</text>
    <rect x="24" y="254" width="312" height="48" rx="8" fill="#F7F8FA"/><text x="40" y="284" class="body">12 Mei 1994</text>
    <rect x="24" y="342" width="312" height="84" rx="12" fill="#F7F8FA"/>
    <text x="44" y="372" class="body bold">User tetap memegang koreksi akhir</text>
    <text x="44" y="395" class="small muted">OCR mengurangi input manual, bukan mengunci</text>
    <text x="44" y="415" class="small muted">user pada hasil ekstraksi.</text>
    ${button('Simpan Perubahan')}`),
  ready: svgUrl(`${appBar('Data Diri')}
    <circle cx="180" cy="203" r="50" fill="#EAF7EF"/>
    <path d="M157 204l15 15 33-38" fill="none" stroke="#25854A" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="180" y="296" text-anchor="middle" class="title">Data siap dilanjutkan</text>
    <text x="180" y="325" text-anchor="middle" class="body muted">Hasil OCR sudah masuk ke form KYC.</text>
    <rect x="24" y="385" width="312" height="106" rx="12" fill="#F7F8FA"/>
    <text x="44" y="417" class="body bold">Contract tetap sama</text>
    <text x="44" y="441" class="small muted">Model di belakang layar berubah.</text>
    <text x="44" y="462" class="small muted">Form dan flow utama tidak perlu dibangun ulang.</text>
    ${button('Lanjut KYC')}`),
}

const copy = {
  id: {
    choose: ['Pilih dokumen', 'documentType dimulai dari sini', 'KTP dan SIM memakai flow yang sama. OCR mengembalikan jenis dokumen sebagai bagian dari response terstruktur.'],
    ktp: ['Foto dokumen', 'Capture KTP', 'Dokumen diambil seperti flow KYC yang sudah berjalan.'],
    sim: ['Foto dokumen', 'Capture SIM', 'SIM menggunakan jalur capture yang sama tanpa OCR pipeline terpisah.'],
    processing: ['OCR berjalan', 'Strict JSON di belakang layar', 'Vertex AI membaca dokumen dan mengembalikan schema yang kompatibel dengan integration lama.'],
    review: ['Review hasil', 'Prefill tetap bisa dikoreksi', 'User melihat data yang sudah terisi dan memutuskan apakah hasilnya sudah benar.'],
    edit: ['Perbaiki field', 'Manual correction tetap tersedia', 'Field yang kurang tepat bisa diubah tanpa mengulang seluruh capture.'],
    ready: ['Lanjutkan KYC', 'Model berubah, contract tetap', 'Flow utama tetap berjalan karena response baru mengikuti contract aplikasi yang sudah ada.'],
  },
  en: {
    choose: ['Choose document', 'documentType starts here', 'KTP and SIM use the same flow. OCR returns the document type as part of the structured response.'],
    ktp: ['Capture document', 'KTP capture', 'The document is captured through the same KYC pattern already used in production.'],
    sim: ['Capture document', 'SIM capture', 'SIM uses the same capture path without requiring a separate OCR pipeline.'],
    processing: ['Run OCR', 'Strict JSON behind the screen', 'Vertex AI reads the document and returns a schema that remains compatible with the previous integration.'],
    review: ['Review prefill', 'The user can still correct it', 'Extracted identity data fills the form, then the user checks whether anything needs changing.'],
    edit: ['Correct a field', 'Manual correction stays available', 'A wrong field can be fixed without repeating the entire document capture.'],
    ready: ['Continue KYC', 'The model changed, the contract did not', 'The main KYC flow can continue because the new response follows the application contract already in use.'],
  },
}

function makeSteps(locale = 'en') {
  const c = copy[locale] || copy.en
  const row = (key, navNumber, src, nextKey, extra = {}) => ({
    key,
    navNumber,
    counter: `${navNumber} / 06`,
    label: c[key][0],
    annotation: c[key][1],
    caption: c[key][2],
    alt: `Illustrative AstraPay OCR ${key} screen`,
    src,
    nextKey,
    event: `kyc_ocr_${key}`,
    ...extra,
  })

  return [
    row('choose', '01', screens.choose, null, {
      hotspots: [
        {label: 'KTP', nextKey: 'ktp', x: 6.5, y: 29.8, width: 87, height: 13.5, event: 'kyc_ocr_choose_ktp'},
        {label: 'SIM', nextKey: 'sim', x: 6.5, y: 45.7, width: 87, height: 13.5, event: 'kyc_ocr_choose_sim'},
      ],
    }),
    row('ktp', '02', screens.ktp, 'processing', {navGroup: 'capture'}),
    row('sim', '02', screens.sim, 'processing', {navGroup: 'capture', showInNav: false}),
    row('processing', '03', screens.processing, 'review'),
    row('review', '04', screens.review, null, {
      hotspots: [
        {label: locale === 'id' ? 'Data sudah benar' : 'Looks correct', nextKey: 'ready', x: 6.5, y: 86.8, width: 87, height: 6.8, event: 'kyc_ocr_accept_prefill'},
        {label: locale === 'id' ? 'Perbaiki field' : 'Correct a field', nextKey: 'edit', x: 6.5, y: 63.8, width: 87, height: 10.5, event: 'kyc_ocr_edit_prefill'},
      ],
    }),
    row('edit', '05', screens.edit, 'ready'),
    row('ready', '06', screens.ready, null, {isEnd: true}),
  ]
}

const presets = {
  'kyc-ocr-vertex-ai-flow-id': {analyticsPrefix: 'kyc_ocr_vertex_ai', steps: makeSteps('id')},
  'kyc-ocr-vertex-ai-flow-en': {analyticsPrefix: 'kyc_ocr_vertex_ai', steps: makeSteps('en')},
}

export function getOcrPrototypePreset(name) {
  return name ? presets[name] || null : null
}
