'use client'

import {useEffect, useState} from 'react'
import styles from './KycAutosaveShowcase.module.css'

const CDN = 'https://cdn.sanity.io/images/iq6vjwu7/production/'
const screen = (sha) => `${CDN}${sha}-360x804.png`
const images = {
  empty: screen('d289dd68fd04594fe21f8b02b09841a48dad6656'),
  ktpSaved: screen('8a80b193775e31e94226b66c3ff78ab863c89b62'),
  selfieSaved: screen('4c4049908532cdef8af92e513e8314bd5433e315'),
  ready: screen('f9ba96fbc4ef17ce6d5bf6dc73b1ec8c26d16ab2'),
  resumeHome: screen('16b15f04730c1a856f24f0a6495d4023c1c05794'),
}
const copy = {
  en: {
    eyebrow: '01 / THE PRODUCT EXPERIENCE',
    heading: 'Two tasks. Either order. Nothing to redo.',
    intro: 'The redesign made ID and Selfie independent tasks. Users could finish one, leave, and return to the Review hub with their completed work intact.',
    choice: 'Explore the two valid paths',
    ktp: 'ID first',
    selfie: 'Selfie first',
    stages: [
      {number: '01', label: 'CHOOSE', title: 'A task hub, not a fixed sequence', note: 'Both capture tasks are available. Submission remains disabled until both are done.'},
      {number: '02', label: 'SAVE', title: 'Completion is visible', note: 'The finished task stays reviewable; the other task remains actionable.'},
      {number: '03', label: 'CONTINUE', title: 'Ready for the next step', note: 'The primary action becomes available only when both tasks are complete.'},
    ],
    revisit: 'The return journey matters as much as the happy path.',
    revisitBody: 'After leaving KYC, the homepage exposes a continue-upgrade entry point. Users return to their saved task state rather than starting from the beginning.',
    revisitLabel: 'RETURN ENTRY',
    open: 'Inspect full-size screen',
    close: 'Close image',
    explore: 'Try the actual interactive flow',
    source: 'Original AstraPay UI screens · Interaction walkthrough below',
  },
  id: {
    eyebrow: '01 / PENGALAMAN PRODUK',
    heading: 'Dua task. Bebas urutan. Tidak perlu mengulang.',
    intro: 'KTP dan Selfie menjadi task yang berdiri sendiri. Pengguna bisa menyelesaikan satu task, keluar, lalu kembali ke Tinjauan dengan progres yang tetap tersimpan.',
    choice: 'Lihat kedua jalur yang tersedia',
    ktp: 'KTP lebih dulu',
    selfie: 'Selfie lebih dulu',
    stages: [
      {number: '01', label: 'PILIH', title: 'Task hub, bukan urutan wajib', note: 'Kedua task tersedia. Pengajuan belum dapat dilanjutkan jika belum lengkap.'},
      {number: '02', label: 'SIMPAN', title: 'Progres yang selesai tetap terlihat', note: 'Task yang sudah selesai dapat ditinjau, sementara task lain tetap dapat dikerjakan.'},
      {number: '03', label: 'LANJUTKAN', title: 'Siap ke langkah berikutnya', note: 'Tombol utama aktif setelah kedua task selesai.'},
    ],
    revisit: 'Pengalaman kembali sama pentingnya dengan happy path.',
    revisitBody: 'Setelah pengguna meninggalkan KYC, halaman beranda menyediakan akses untuk melanjutkan upgrade. Pengguna kembali ke progres yang tersimpan, bukan memulai ulang.',
    revisitLabel: 'MASUK KEMBALI',
    open: 'Lihat layar ukuran penuh',
    close: 'Tutup gambar',
    explore: 'Coba alur interaktifnya',
    source: 'Tampilan UI AstraPay asli · Alur interaktif tersedia di bawah',
  },
}

export default function KycAutosaveShowcase({lang = 'en'}) {
  const t = copy[lang] || copy.en
  const [path, setPath] = useState('ktp')
  const [zoom, setZoom] = useState(null)
  useEffect(() => {
    if (!zoom) return undefined
    const onKey = (event) => { if (event.key === 'Escape') setZoom(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [zoom])
  const frames = [
    {src: images.empty, alt: 'KYC Review hub with two incomplete tasks'},
    {src: path === 'ktp' ? images.ktpSaved : images.selfieSaved, alt: path === 'ktp' ? 'KTP saved while Selfie remains incomplete' : 'Selfie saved while KTP remains incomplete'},
    {src: images.ready, alt: 'KYC Review hub with both KTP and Selfie complete'},
  ]
  return (
    <section className={styles.showcase} aria-labelledby="kyc-showcase-title">
      <div className={styles.top}>
        <div className={styles.intro}>
          <span className={styles.eyebrow}>{t.eyebrow}</span>
          <h2 id="kyc-showcase-title">{t.heading}</h2>
          <p>{t.intro}</p>
        </div>
        <div className={styles.pathSelector}>
          <span>{t.choice}</span>
          <div className={styles.segment} role="group" aria-label={t.choice}>
            <button type="button" aria-pressed={path === 'ktp'} className={path === 'ktp' ? styles.selected : ''} onClick={() => setPath('ktp')}>{t.ktp}</button>
            <button type="button" aria-pressed={path === 'selfie'} className={path === 'selfie' ? styles.selected : ''} onClick={() => setPath('selfie')}>{t.selfie}</button>
          </div>
        </div>
      </div>
      <div className={styles.timeline}>
        {frames.map((frame, index) => (
          <article key={index} className={styles.stageCard}>
            <div className={styles.stageHeader}>
              <span className={styles.stageNumber}>{t.stages[index].number}</span>
              <span className={styles.stageEyebrow}>{t.stages[index].label}</span>
            </div>
            <button className={styles.screenButton} type="button" onClick={() => setZoom(frame)} aria-label={t.open + ': ' + frame.alt}>
              <img src={frame.src} alt={frame.alt} width="360" height="804" loading={index === 0 ? 'eager' : 'lazy'} />
              <span className={styles.zoomHint} aria-hidden="true">↗</span>
            </button>
            <div className={styles.stageCopy}>
              <h3>{t.stages[index].title}</h3>
              <p>{t.stages[index].note}</p>
            </div>
          </article>
        ))}
      </div>
      <div className={styles.returnRail}>
        <div>
          <span className={styles.eyebrow}>{t.revisitLabel}</span>
          <h3>{t.revisit}</h3>
          <p>{t.revisitBody}</p>
          <a className={styles.flowLink} href="#interactive-kyc-autosave">{t.explore} <span aria-hidden="true">↗</span></a>
        </div>
        <button className={styles.returnVisual} type="button" onClick={() => setZoom({src: images.resumeHome, alt: 'AstraPay homepage with continue upgrade banner'})} aria-label={t.open + ': resume from homepage'}>
          <img src={images.resumeHome} alt="AstraPay homepage with continue upgrade banner" width="360" height="804" loading="lazy" />
          <span aria-hidden="true">↗</span>
        </button>
      </div>
      <p className={styles.source}>{t.source}</p>
      {zoom && (
        <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={zoom.alt} onClick={() => setZoom(null)}>
          <button type="button" className={styles.close} onClick={() => setZoom(null)} aria-label={t.close}>✕</button>
          <img src={zoom.src} alt={zoom.alt} width="360" height="804" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </section>
  )
}
