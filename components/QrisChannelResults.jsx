'use client'

import {useState} from 'react'
import styles from './QrisChannelResults.module.css'

// AstraPay cash-in channels, 2026 YTD through 21 October 2026.
// User-supplied dataset; rank, volume, unique users, GTV, and average are not estimates.
const CHANNELS = [
 {name:'BCA',type:'VA',trxRank:1,gtvRank:1,trx:2592944,users:340835,gtv:2514381345870,avg:969701},
 {name:'PERMATA',type:'VA',trxRank:2,gtvRank:2,trx:764695,users:152129,gtv:662120560383,avg:865862},
 {name:'QRIS Top Up',type:'QRIS',trxRank:3,gtvRank:8,trx:623275,users:160487,gtv:147279369788,avg:236299},
 {name:'BRI',type:'VA',trxRank:4,gtvRank:3,trx:538133,users:105752,gtv:578141610793,avg:1074347},
 {name:'MANDIRI',type:'VA',trxRank:5,gtvRank:4,trx:390607,users:84398,gtv:417663777017,avg:1069269},
 {name:'SAQU',type:'BANK',trxRank:6,gtvRank:6,trx:296981,users:56419,gtv:309342438134,avg:1041624},
 {name:'BNI',type:'VA',trxRank:7,gtvRank:5,trx:291097,users:52274,gtv:316381115374,avg:1086858},
 {name:'CIMB',type:'VA',trxRank:8,gtvRank:7,trx:287528,users:65301,gtv:282787466026,avg:983513},
 {name:'ALFAMART',type:'OTC',trxRank:9,gtvRank:9,trx:70457,users:14348,gtv:27815872000,avg:394792},
 {name:'ALFAMIDI',type:'OTC',trxRank:10,gtvRank:11,trx:9553,users:2299,gtv:3735250000,avg:391003},
 {name:'UOB',type:'VA',trxRank:11,gtvRank:10,trx:8837,users:1368,gtv:5665594500,avg:641122},
 {name:'SHINHAN',type:'VA',trxRank:12,gtvRank:12,trx:155,users:48,gtv:150174067,avg:968865},
 {name:'PANIN',type:'VA',trxRank:13,gtvRank:13,trx:33,users:9,gtv:31841500,avg:964894},
 {name:'DANAMON',type:'VA',trxRank:14,gtvRank:14,trx:3,users:2,gtv:25503,avg:8501}
]
const totalTrx = CHANNELS.reduce((sum,ch)=>sum+ch.trx,0)
const totalGtv = CHANNELS.reduce((sum,ch)=>sum+ch.gtv,0)
const qr = CHANNELS[2]
const dict={
 en:{
  period:'ACTUAL RESULTS · 2026 YTD THROUGH OCT 21',
  title:'High-frequency top-ups, smaller payment values.',
  intro:'QRIS Top Up ranks third for transaction count across 14 cash-in channels, but eighth for gross transaction value (GTV). The distinction matters: adoption is strong even though the typical payment is smaller than bank-channel top-ups.',
  kpis:[['#3','Transaction rank'],['10.61%','Transaction share'],['#8','GTV rank'],['2.80%','GTV share']],
  chart:'Where QRIS stands among cash-in channels',
  chartIntro:'Switch the comparison to see all channels ranked by their share of transactions or payment value. QRIS is highlighted, with actual amounts shown alongside each bar.',
  trx:'Transactions',gtv:'GTV',metricSuffix:'share',
  all:'Show all 14 channels',less:'Show top 8',
  details:'QRIS channel footprint',
  count:'Transactions',people:'Unique QRIS users',money:'GTV',avg:'Average top-up',
  combined:'All listed channels, 2026 YTD',units:'transactions',
  note:'Source: AstraPay cash-in channel summary supplied by the designer, January 1–October 21, 2026. Unique-user counts are channel-specific and must not be summed across channels. Shares use all 14 listed channels. These are observed adoption figures, not a measured causal impact of this UI.',
  modeLabel:'Compare by'
 },
 id:{
  period:'HASIL AKTUAL · 2026 YTD HINGGA 21 OKT',
  title:'Transaksi tinggi, dengan nominal pembayaran lebih kecil.',
  intro:'QRIS Top Up berada di peringkat ketiga berdasarkan jumlah transaksi dari 14 channel cash-in, tetapi peringkat kedelapan berdasarkan gross transaction value (GTV). Adopsinya tinggi, meski rata-rata nominal lebih kecil dari top up bank.',
  kpis:[['#3','Peringkat transaksi'],['10,61%','Porsi transaksi'],['#8','Peringkat GTV'],['2,80%','Porsi GTV']],
  chart:'Posisi QRIS dibandingkan channel cash-in lain',
  chartIntro:'Pilih metrik untuk membandingkan seluruh channel berdasarkan porsi transaksi atau nilai pembayaran. QRIS diberi highlight, dengan jumlah aktual di samping setiap bar.',
  trx:'Transaksi',gtv:'GTV',metricSuffix:'porsi',
  all:'Tampilkan semua 14 channel',less:'Tampilkan 8 channel teratas',
  details:'Capaian channel QRIS',
  count:'Transaksi',people:'Unique user QRIS',money:'GTV',avg:'Rata-rata top up',
  combined:'Total seluruh channel, 2026 YTD',units:'transaksi',
  note:'Sumber: ringkasan channel cash-in AstraPay yang diberikan desainer, 1 Januari–21 Oktober 2026. Unique user dihitung per channel dan tidak boleh dijumlahkan antar-channel. Porsi memakai 14 channel dalam dataset. Angka ini mencerminkan adopsi teramati, bukan dampak kausal UI yang terukur.',
  modeLabel:'Bandingkan berdasarkan'
 }
}
const fmt=(num,lang)=>new Intl.NumberFormat(lang==='id'?'id-ID':'en-US').format(num)
const percent=(num,lang)=>new Intl.NumberFormat(lang==='id'?'id-ID':'en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(num)+'%'
const currency=(num,lang)=>'Rp'+fmt(num,lang)
const compact=(num,lang)=>'Rp'+new Intl.NumberFormat(lang==='id'?'id-ID':'en-US',{maximumFractionDigits:2}).format(num/1e9)+(lang==='id'?' miliar':'B')
export default function QrisChannelResults({lang='en'}){
 const t=dict[lang]||dict.en
 const [mode,setMode]=useState('trx')
 const [showAll,setShowAll]=useState(false)
 const rank=mode==='trx'?'trxRank':'gtvRank'
 const total=mode==='trx'?totalTrx:totalGtv
 const ordered=[...CHANNELS].sort((a,b)=>a[rank]-b[rank])
 const rows=showAll?ordered:ordered.slice(0,8)
 const share=(ch)=>100*ch[mode]/total
 return <section className={styles.root} aria-labelledby="qris-current-results-title">
  <header className={styles.header}>
   <span className={styles.eyebrow}>{t.period}</span>
   <h2 id="qris-current-results-title">{t.title}</h2>
   <p>{t.intro}</p>
  </header>
  <div className={styles.kpis}>
   {t.kpis.map(k=><div key={k[1]}><strong>{k[0]}</strong><span>{k[1]}</span></div>)}
  </div>
  <div className={styles.chart}>
   <div className={styles.chartHeader}>
    <div><h3>{t.chart}</h3><p>{t.chartIntro}</p></div>
    <div className={styles.toggle} role="group" aria-label={t.modeLabel}>
     <button type="button" aria-pressed={mode==='trx'} onClick={()=>setMode('trx')}>{t.trx}</button>
     <button type="button" aria-pressed={mode==='gtv'} onClick={()=>setMode('gtv')}>{t.gtv}</button>
    </div>
   </div>
   <div className={styles.bars} role="list">
    {rows.map(ch=><div role="listitem" key={ch.name} className={ch.type==='QRIS'?styles.qrisRow:styles.barRow}>
      <span className={styles.rank}>{String(ch[rank]).padStart(2,'0')}</span>
      <span className={styles.channel}>{ch.name}</span>
      <div className={styles.track}><div className={styles.bar} style={{width:Math.max(.12,share(ch)/50*100)+'%'}} /></div>
      <strong className={styles.share}>{percent(share(ch),lang)}</strong>
      <span className={styles.amount}>{mode==='trx'?fmt(ch.trx,lang):compact(ch.gtv,lang)}</span>
    </div>)}
   </div>
   <button className={styles.showAll} type="button" onClick={()=>setShowAll(!showAll)}>{showAll?t.less:t.all} <span aria-hidden="true">{showAll?'↑':'↓'}</span></button>
  </div>
  <div className={styles.footprint}>
   <h3>{t.details}</h3>
   <div className={styles.detailGrid}>
    {[[fmt(qr.trx,lang),t.count],[fmt(qr.users,lang),t.people],[compact(qr.gtv,lang),t.money],[currency(qr.avg,lang),t.avg]].map(x=><div key={x[1]}><strong>{x[0]}</strong><span>{x[1]}</span></div>)}
   </div>
   <p className={styles.total}><strong>{t.combined}</strong> · {fmt(totalTrx,lang)} {t.units} · {compact(totalGtv,lang)} GTV</p>
  </div>
  <p className={styles.notes}>{t.note}</p>
 </section>
}
