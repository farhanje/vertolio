const blue = '#1557E8'
const muted = '#666666'
const line = '#E4E4E4'

const cdn = (asset) => `https://cdn.sanity.io/images/iq6vjwu7/production/${asset}?w=1000&q=90&auto=format`

const realScreens = {
  entry: cdn('cdefb5d75fe2137aaef619a2bd2ca1b5b10e3c0d-360x654.png'),
  amount: cdn('6d357aee603c27284bd4bd80cd5b6752e7789d2e-360x654.png'),
  qr: cdn('679412c4d23a7f73d9d402357374c2c3adf62e05-360x654.png'),
  waiting: cdn('71d837a98721989cf8ecdcb8692bb39c0450d85a-360x654.png'),
  success: cdn('fdada037ae935d969db8c38cda57c26a56bc49cd-360x654.png'),
}

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

function button(label, y = 570) {
  return `<rect x="24" y="${y}" width="312" height="44" rx="9" fill="${blue}"/><text x="180" y="${y + 28}" text-anchor="middle" class="body bold" fill="#fff" style="fill:#fff">${label}</text>`
}

const placeholderScreens = {
  expired: svgUrl(`${appBar('QRIS Top Up')}
    <circle cx="180" cy="205" r="56" fill="#F3F4F6"/>
    <path d="M157 182l46 46M203 182l-46 46" stroke="#555" stroke-width="8" stroke-linecap="round"/>
    <text x="180" y="298" text-anchor="middle" class="title">QR sudah expired</text>
    <text x="180" y="329" text-anchor="middle" class="body muted">Pembayaran belum diterima sampai batas waktu.</text>
    <text x="180" y="352" text-anchor="middle" class="body muted">Buat QR baru untuk melanjutkan top up.</text>
    <rect x="24" y="405" width="312" height="96" rx="12" fill="#F7F8FA"/>
    <text x="44" y="437" class="body bold">Transaksi ditutup dengan jelas</text>
    <text x="44" y="463" class="small muted">Bill lama tidak digunakan kembali.</text>
    <text x="44" y="484" class="small muted">User bisa memulai transaksi baru dengan aman.</text>
    ${button('Buat QR Baru')}`),
  recovery: svgUrl(`${appBar('QRIS Top Up')}
    <circle cx="180" cy="205" r="56" fill="#EAF0FF"/>
    <path d="M153 207a29 29 0 1 1 8 20" fill="none" stroke="${blue}" stroke-width="8" stroke-linecap="round"/>
    <path d="M148 213l5-19 17 10" fill="${blue}"/>
    <text x="180" y="298" text-anchor="middle" class="title">Status sedang diperbarui</text>
    <text x="180" y="329" text-anchor="middle" class="body muted">Kami sedang memastikan status pembayaran.</text>
    <text x="180" y="352" text-anchor="middle" class="body muted">Tidak perlu melakukan pembayaran ulang.</text>
    <rect x="24" y="405" width="312" height="96" rx="12" fill="#F7F8FA"/>
    <text x="44" y="437" class="body bold">Recovery tanpa transaksi duplikat</text>
    <text x="44" y="463" class="small muted">Sistem mengecek bill yang sama terlebih dulu.</text>
    <text x="44" y="484" class="small muted">Success baru tampil setelah state terkonfirmasi.</text>
    ${button('Cek Status Lagi')}`),
}

const copy = {
  en: {
    entry: ['Top Up entry', 'Choose QRIS', 'Start from the existing Top Up area and select QRIS as the cash-in method.'],
    amount: ['Enter amount', 'Define the bill', 'The user sets the amount before the system generates a QR for the payer.'],
    qr: ['Show QR', 'Hand the interaction to the payer', 'The AstraPay user presents the QR instead of sharing an account number.'],
    waiting: ['Waiting for payment', 'Keep the state explicit', 'The interface stays in a waiting state while the payer completes the transaction.'],
    success: ['Top up complete', 'Confirm only after payment resolves', 'Success appears after the payment state is confirmed and the balance can be updated.'],
    expired: ['Expired QR', 'End an unpaid bill cleanly', 'An unpaid QR should expire clearly so the user knows to create a new transaction.'],
    recovery: ['Status recovery', 'Recheck without duplicating payment', 'A delayed callback or temporary status issue should trigger a safe recheck, not another transaction.'],
  },
  id: {
    entry: ['Masuk ke Top Up', 'Pilih QRIS', 'Mulai dari area Top Up yang sudah ada lalu pilih QRIS sebagai metode cash-in.'],
    amount: ['Masukkan nominal', 'Bentuk bill', 'User menentukan nominal sebelum sistem membuat QR untuk payer.'],
    qr: ['Tampilkan QR', 'Payer mengambil alih proses', 'User AstraPay cukup menunjukkan QR tanpa perlu membagikan nomor akun.'],
    waiting: ['Menunggu pembayaran', 'Status tetap jelas', 'Interface tetap berada pada waiting state selama payer menyelesaikan transaksi.'],
    success: ['Top up berhasil', 'Success setelah transaksi selesai', 'Success baru ditampilkan setelah state pembayaran terkonfirmasi dan saldo bisa diperbarui.'],
    expired: ['QR expired', 'Akhiri bill yang tidak dibayar', 'QR yang tidak dibayar perlu berakhir dengan jelas agar user tahu harus membuat transaksi baru.'],
    recovery: ['Recovery status', 'Cek ulang tanpa transaksi duplikat', 'Callback yang terlambat atau masalah status sementara perlu memicu pengecekan aman, bukan transaksi baru.'],
  },
}

function makeSteps(locale = 'en') {
  const c = copy[locale] || copy.en
  const row = (key, navNumber, src, nextKey, isEnd = false) => ({
    key,
    navNumber,
    counter: `${navNumber} / 07`,
    label: c[key][0],
    annotation: c[key][1],
    caption: c[key][2],
    alt: `AstraPay QRIS Top Up ${key} screen`,
    src,
    nextKey,
    isEnd,
    event: `qris_top_up_${key}`,
  })

  return [
    row('entry', '01', realScreens.entry, 'amount'),
    row('amount', '02', realScreens.amount, 'qr'),
    row('qr', '03', realScreens.qr, 'waiting'),
    row('waiting', '04', realScreens.waiting, 'success'),
    row('success', '05', realScreens.success, null, true),
    row('expired', '06', placeholderScreens.expired, 'recovery'),
    row('recovery', '07', placeholderScreens.recovery, null, true),
  ]
}

const presets = {
  'qris-top-up-flow-en': {analyticsPrefix: 'qris_top_up_revamp', steps: makeSteps('en')},
  'qris-top-up-flow-id': {analyticsPrefix: 'qris_top_up_revamp', steps: makeSteps('id')},
}

export function getQrisPrototypePreset(name) {
  return name ? presets[name] || null : null
}
