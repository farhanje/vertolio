'use client'

import {useEffect, useState} from 'react'
import styles from './QrisTopUpShowcase.module.css'

const CDN = 'https://cdn.sanity.io/images/iq6vjwu7/production/'
const assets = {
  home: CDN + '6173a7a85663eb051c623f093c5c2414c0ff11d4-540x1208.png',
  methods: CDN + '4cbfccd3109a3510c4ec48d6da1f711deb80659e-360x805.png',
  amount: CDN + '59c364928a0c0f8d371b5c4827c32cdffe59f74a-360x805.png',
  qr: CDN + '3f1ad9eb42fd63c88fcb66e9861966a8dbfb71a0-360x805.png',
  share: CDN + '30fc8a067ec067edb4f44e990031f967e19cfd15-360x805.png',
  success: CDN + '00d327e655f5f733d434bae5d7dead2cf5fb0221-360x805.png',
}
const screens = [
  {key: 'home', src: assets.home, label: 'AstraPay homepage'},
  {key: 'methods', src: assets.methods, label: 'QRIS payment method selection'},
  {key: 'amount', src: assets.amount, label: 'QRIS top up amount and fee selection'},
  {key: 'qr', src: assets.qr, label: 'One-time QRIS payment code and deadline'},
  {key: 'share', src: assets.share, label: 'Native share sheet for generated QR code'},
  {key: 'success', src: assets.success, label: 'AstraPay successful top-up confirmation'},
]
const copy = {
  en: {
    eyebrow: 'THE SHIPPED PRODUCT',
    heading: 'A top-up experience built around one scannable bill.',
    intro: 'The interface makes the payable amount explicit, gives the payer a QR they can scan or receive, and confirms success only after the payment resolves.',
    metrics: [{value: '9.3%',label: 'Share of cash-in by 2026'},{value: 'Top 2',label: 'Cash-in channel rank'}],
    cards: [
      {number: '01 / DEFINE',title: 'Show the total before creating a QR',desc: 'The user selects Rp50,000 while the interface shows an additional Rp1,000 admin fee, making the payable total Rp51,000.'},
      {number: '02 / HAND OFF',title: 'Make the payment artifact unambiguous',desc: 'The QR displays the exact payable amount, recipient, one-use instruction, and payment deadline.'},
      {number: '03 / CONFIRM',title: 'Separate a completed payment from a displayed QR',desc: 'The success screen confirms Rp50,000 credited and offers navigation back to Home or transaction details.'},
    ],
    linkEyebrow: 'TRY THE REAL SCREENS',
    linkTitle: 'Follow the interaction from entry to confirmation',
    linkIntro: 'Tap the highlighted action on the phone, or choose a screen. The final confirmation is an example of the successful outcome, not a simulated live payment.',
    nav: ['Home','Top Up methods','Set amount','Display QR','Share QR','Success'],
    start: 'Start from app entry',
    paymentResult: 'View example successful result',
    paymentNote: 'This previews a confirmed payment screen; no real transaction is processed.',
    back: 'Back',
    close: 'Close full-size image',
    zoom: 'View original screen at full size',
    action: {home:'Tap Top Up',methods:'Choose QRIS Top Up',amount:'Continue with selected amount',qr:'Open share options',share:'Close share sheet',success:'Back to the QR example'},
    hint: {home:'Tap Top Up in the balance card.',methods:'Select QRIS Top Up.',amount:'Continue after choosing the displayed amount.',qr:'Use the share icon, or preview the confirmed-payment result below.',share:'This screenshot shows the native share sheet. Close it to return to the QR.',success:'An example of the actual success state after payment confirmation.'},
    designNote: 'Original AstraPay product screens supplied by the designer. The share sheet is native OS UI; payment confirmation is shown as a documented outcome rather than an emulated transaction.',
  },
  id: {
    eyebrow: 'PRODUK YANG DIRILIS',
    heading: 'Satu tagihan top up, satu QR yang bisa dibayar.',
    intro: 'UI memperlihatkan nominal yang harus dibayar, QR yang bisa dipindai atau dibagikan, dan status berhasil setelah pembayaran terkonfirmasi.',
    metrics: [{value: '9,3%',label: 'Porsi cash-in pada 2026'},{value: 'Top 2',label: 'Peringkat channel cash-in'}],
    cards: [
      {number: '01 / NOMINAL',title: 'Total pembayaran terlihat sejak awal',desc: 'Pengguna memilih Rp50.000 dengan biaya admin Rp1.000 sehingga total yang dibayarkan adalah Rp51.000.'},
      {number: '02 / QR',title: 'Instruksi pembayaran dibuat eksplisit',desc: 'QR menampilkan jumlah tagihan, penerima, ketentuan satu kali transaksi, dan batas waktu pembayaran.'},
      {number: '03 / KONFIRMASI',title: 'QR tampil tidak sama dengan pembayaran berhasil',desc: 'Layar sukses mengonfirmasi saldo Rp50.000 dan menyediakan akses kembali ke Beranda atau detail transaksi.'},
    ],
    linkEyebrow: 'COBA LAYAR ASLINYA',
    linkTitle: 'Ikuti interaksi dari masuk hingga berhasil',
    linkIntro: 'Klik aksi pada layar ponsel atau pilih layar. Konfirmasi akhir merupakan contoh hasil pembayaran sukses, bukan transaksi sungguhan.',
    nav: ['Beranda','Metode Top Up','Pilih nominal','Tampilkan QR','Bagikan QR','Berhasil'],
    start: 'Mulai dari Beranda',
    paymentResult: 'Lihat contoh hasil transaksi berhasil',
    paymentNote: 'Ini hanya tampilan transaksi sukses; tidak ada pembayaran sungguhan.',
    back: 'Kembali',
    close: 'Tutup gambar ukuran penuh',
    zoom: 'Lihat layar asli dengan ukuran penuh',
    action: {home:'Klik Top Up',methods:'Pilih QRIS Top Up',amount:'Lanjutkan dengan nominal',qr:'Buka menu bagikan',share:'Tutup menu bagikan',success:'Kembali ke contoh QR'},
    hint: {home:'Klik Top Up pada kartu saldo.',methods:'Pilih QRIS Top Up.',amount:'Lanjutkan setelah memilih nominal yang ditampilkan.',qr:'Pakai ikon bagikan, atau lihat contoh hasil berhasil lewat tombol di bawah.',share:'Layar ini merupakan menu bagikan bawaan sistem. Tutup untuk kembali ke QR.',success:'Contoh layar sebenarnya setelah pembayaran dikonfirmasi.'},
    designNote: 'Seluruh layar produk asli AstraPay yang diberikan desainer. Menu bagikan menggunakan UI bawaan sistem operasi; konfirmasi pembayaran ditampilkan sebagai contoh, bukan transaksi simulasi sungguhan.',
  },
}
const hotspots = {
  home: {next:'methods',x:69,y:26,w:29,h:12},
  methods: {next:'amount',x:5,y:16,w:90,h:10},
  amount: {next:'qr',x:6,y:92,w:88,h:7},
  qr: {next:'share',x:82,y:4,w:18,h:8},
  share: {next:'qr',x:85,y:42,w:15,h:10},
}
function track(event, value) {
  try { if (typeof window !== 'undefined') window.umami?.track?.('qris_showcase_' + event, {screen: value}) } catch {}
}

export default function QrisTopUpShowcase({lang = 'en'}) {
  const t = copy[lang] || copy.en
  const [current, setCurrent] = useState('amount')
  const [expanded, setExpanded] = useState(null)
  const item = screens.find(s => s.key === current) || screens[2]
  const active = screens.findIndex(s => s.key === current)
  const hotspot = hotspots[current]

  useEffect(() => {
    if (!expanded) return
    const onKey = (e) => {if (e.key === 'Escape') setExpanded(null)}
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [expanded])

  const goTo = (key) => {
    if (!screens.some(s => s.key === key)) return
    setCurrent(key)
    track('navigate',key)
  }

  return (
    <section className={styles.showcase} aria-labelledby="qris-design-showcase">
      <header className={styles.header}>
        <div className={styles.lead}>
          <span className={styles.eyebrow}>{t.eyebrow}</span>
          <h2 id="qris-design-showcase">{t.heading}</h2>
          <p>{t.intro}</p>
        </div>
        <div className={styles.metrics}>
          {t.metrics.map(m => <div key={m.label}><strong>{m.value}</strong><span>{m.label}</span></div>)}
        </div>
      </header>
      <div className={styles.triptych}>
        {['amount','qr','success'].map((key,i) => (
          <article className={styles.card} key={key}>
            <span className={styles.cardEyebrow}>{t.cards[i].number}</span>
            <button className={styles.cardImage} type="button" onClick={() => setExpanded(screens.find(s=>s.key===key))} aria-label={t.zoom+': '+screens.find(s=>s.key===key).label}>
              <img src={assets[key]} alt={screens.find(s=>s.key===key).label} width="360" height="805" loading={i===0?'eager':'lazy'} />
              <span aria-hidden="true">↗</span>
            </button>
            <h3>{t.cards[i].title}</h3>
            <p>{t.cards[i].desc}</p>
          </article>
        ))}
      </div>

      <div className={styles.walkthrough} id="interactive-qris-top-up">
        <div className={styles.explainer}>
          <span className={styles.eyebrow}>{t.linkEyebrow}</span>
          <h3>{t.linkTitle}</h3>
          <p>{t.linkIntro}</p>
          <button className={styles.restart} type="button" onClick={() => goTo('home')}>↻ {t.start}</button>
          <nav className={styles.flowNav} aria-label={t.linkTitle}>
            {screens.map((s,i) => (
              <button key={s.key} aria-current={current===s.key?'step':undefined} className={current===s.key?styles.current:''} onClick={() => goTo(s.key)} type="button">
                <span>{String(i+1).padStart(2,'0')}</span>{t.nav[i]}
              </button>
            ))}
          </nav>
        </div>
        <div className={styles.interaction}>
          <div className={styles.interactionHeader}><span>{t.nav[active]}</span><span>{String(active+1).padStart(2,'0')} / 06</span></div>
          <div className={styles.deviceArea}>
            <div className={styles.phone}>
              <img src={item.src} alt={item.label} width={current==='home'?540:360} height={current==='home'?1208:805} />
              {hotspot ? <button type="button" className={styles.hotspot} onClick={() => goTo(hotspot.next)} style={{left:hotspot.x+'%',top:hotspot.y+'%',width:hotspot.w+'%',height:hotspot.h+'%'}} aria-label={t.action[current]}><span>{t.action[current]}</span></button>:null}
            </div>
          </div>
          <div className={styles.viewerFoot}>
            <p>{t.hint[current]}</p>
            <div className={styles.viewerControls}>
              <button type="button" onClick={() => setExpanded(item)} aria-label={t.zoom}>↗</button>
              <button type="button" onClick={() => goTo(screens[Math.max(0,active-1)].key)} disabled={active===0} aria-label={t.back}>←</button>
            </div>
          </div>
          {current==='qr' ? <div className={styles.resultControl}><button type="button" onClick={() => goTo('success')}>{t.paymentResult} <span aria-hidden="true">↗</span></button><small>{t.paymentNote}</small></div> : null}
          {current==='success' ? <div className={styles.resultControl}><button type="button" onClick={() => goTo('qr')}>{t.action.success} ↶</button></div> : null}
        </div>
      </div>
      <p className={styles.source}>{t.designNote}</p>
      {expanded && <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={expanded.label} onClick={() => setExpanded(null)}>
        <button className={styles.close} type="button" onClick={() => setExpanded(null)} aria-label={t.close}>✕</button>
        <img src={expanded.src} alt={expanded.label} width={expanded.key==='home'?540:360} height={expanded.key==='home'?1208:805} onClick={e=>e.stopPropagation()} />
      </div>}
    </section>
  )
}
