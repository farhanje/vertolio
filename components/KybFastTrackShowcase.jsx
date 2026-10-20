'use client'

import {useEffect, useState} from 'react'
import styles from './KybFastTrackShowcase.module.css'

const ROOT='https://cdn.sanity.io/images/iq6vjwu7/production/'
const screens=[
 {key:'before',src:ROOT+'fd927af5811529b73ea5f3ae11dbbd81ffa82835-1672x941.png',width:1672,height:941},
 {key:'onepage',src:ROOT+'1f4c2642797b23c15379c66eb690ec4b8e0602fd-2016x982.png',width:2016,height:982},
 {key:'instant',src:ROOT+'f384a00073ff13f23728680bfc8c89f0e6dbc7bb-1440x854.png',width:1440,height:854},
]
const copy={
 en:{
   eyebrow:'DESIGNING FOR OPERATIONS · KYB ADMIN WEB',
   title:'One review for clear cases. Deeper review where it matters.',
   intro:'A partner onboarding program targeted roughly 15,000 SRC merchants while a small Operations team continued business-as-usual KYB. I redesigned the desktop review journey around eligibility, a single-page first pass, and a bounded approval path.',
   stat:[{n:'~15K',label:'Partnership cohort target'},{n:'~3',label:'Ops reviewers including BAU'},{n:'3–5 mo',label:'Program rollout window'}],
   qualification:'Program scope, staffing and rollout—not verified throughput, acceptance uplift, or fraud reduction.',
   original:'REAL ADMIN-WEB DESIGN ARTIFACTS',
   visualTitle:'The redesign reduced review navigation before it changed approval authority.',
   visualBody:'Inspect the actual screens used to communicate the old review flow, consolidated first-pass workspace and Instant Approve control. These are original desktop artifacts, not reconstructed mobile mocks.',
   view:'Inspect original at full size',
   screens:[
     {key:'before',label:'01 · Before',heading:'Four-step review, then a second approver',desc:'Reviewers navigated separate stages to examine the merchant. Clear cases then moved to another approval pass.',note:'Baseline · Sequential review'},
     {key:'onepage',label:'02 · One-page review',heading:'Scan the relevant evidence in one continuous view',desc:'A single desktop view brings core merchant information and supporting documents together for the first review.',note:'Changed interface · Fewer navigation steps'},
     {key:'instant',label:'03 · Instant Approve',heading:'A distinct action for eligible, clear cases',desc:'Instant Approve is separated from Reject. Cases with issues still take a deeper review path.',note:'Controlled action · One pass for clear cases'}
   ],
   takeaways:[
     {n:'01',title:'Information density',body:'Keep the data and documents within one scanning context instead of asking an operator to switch between four review steps.'},
     {n:'02',title:'Action hierarchy',body:'Make the approve action distinct from rejection, especially during repetitive review.'},
     {n:'03',title:'Review depth',body:'Only merchants who passed cohort validation and the first review could take the fast route.'}
   ],
   decisionLabel:'INTERACTIVE ROUTING MODEL',
   decisionTitle:'Fast track is conditional—not a shortcut anyone can choose.',
   decisionBody:'Follow the routing decisions behind the interface. This is an explanatory model of the documented workflow, not a live Admin Web system.',
   gate:'01 · COHORT ELIGIBILITY',
   gateQ:'Was the merchant submitted with a backend-validated SRC referral code?',
   yes:'Validated SRC cohort',
   no:'Not eligible',
   follow:'02 · FIRST-PASS FINDING',
   followQ:'Did the eligible merchant’s data and documents pass the initial reviewer check?',
   clear:'Clear case',
   exception:'Needs deeper review',
   standardTitle:'Standard KYB',
   standardDesc:'Merchant remains in the ordinary verifier → approver process. No access to the partner-only fast track.',
   fastTitle:'Instant Approve · 1 pass',
   fastDesc:'Eligible and clear case ends in the first review without repeating the second approval pass.',
   exceptionTitle:'Exception / secondary review',
   exceptionDesc:'Problematic cases proceed to additional review, remarks, or corrective action instead of being approved automatically.',
   blank:'Choose a cohort route above to explore what happens.',
   reset:'Start again',
   viewUI:'View associated Admin Web design',
   source:'Source: existing AstraPay Admin Web screenshots and project write-up. The route selector is a transparent illustration of operational rules, not a reproduction of production routing controls.',
   outcomes:'There is no verified time-to-review reduction, fraud-rate uplift, or approval-rate improvement in this record. The evidence supports a bounded rollout and a changed review design—not quantified operational efficiency.',
   close:'Close full-size screen'
 },
 id:{
   eyebrow:'DESAIN UNTUK OPERATIONS · ADMIN WEB KYB',
   title:'Satu review untuk clear case. Review lebih dalam untuk exception.',
   intro:'Program partnership menargetkan sekitar 15.000 merchant SRC, sementara tim Operations yang kecil tetap menangani KYB BAU. Saya merancang ulang review desktop dengan eligibility yang tervalidasi, first-pass satu halaman, dan jalur approval yang dibatasi.',
   stat:[{n:'~15K',label:'Target cohort partnership'},{n:'~3',label:'Reviewer Ops sekaligus BAU'},{n:'3–5 bln',label:'Periode rollout program'}],
   qualification:'Ini scope program, staffing, dan rollout—bukan data throughput, uplift approval, atau penurunan fraud yang telah diukur.',
   original:'ARTEFAK ASLI ADMIN WEB',
   visualTitle:'Navigasi review disederhanakan sebelum kewenangan approval diubah.',
   visualBody:'Lihat layar asli yang menunjukkan flow review sebelumnya, workspace first-pass satu halaman, dan kontrol Instant Approve. Semuanya artefak desktop, bukan mockup mobile yang dibuat ulang.',
   view:'Lihat layar asli ukuran penuh',
   screens:[
    {key:'before',label:'01 · Sebelum',heading:'Empat langkah review lalu second approver',desc:'Reviewer berpindah antar tahap untuk meninjau merchant. Clear case masih diteruskan ke approval berikutnya.',note:'Baseline · Review berurutan'},
    {key:'onepage',label:'02 · One-page review',heading:'Data dan dokumen dipindai dalam satu halaman',desc:'Informasi merchant dan dokumen pendukung diletakkan bersama agar reviewer tidak perlu berpindah antar langkah.',note:'Perubahan UI · Navigasi lebih ringkas'},
    {key:'instant',label:'03 · Instant Approve',heading:'Aksi khusus untuk eligible clear case',desc:'Instant Approve terpisah dari Reject. Case yang bermasalah tetap masuk jalur pemeriksaan lebih dalam.',note:'Kontrol · Satu pass untuk clear case'}
   ],
   takeaways:[
    {n:'01',title:'Hierarki informasi',body:'Data dan dokumen berada dalam satu konteks sehingga operator tidak harus berganti empat langkah review.'},
    {n:'02',title:'Hierarki aksi',body:'Tindakan approve dibuat berbeda dari reject, terutama untuk proses review yang berulang.'},
    {n:'03',title:'Kedalaman review',body:'Hanya merchant dari cohort tervalidasi dan lolos first review yang bisa masuk jalur cepat.'}
   ],
   decisionLabel:'MODEL ROUTING INTERAKTIF',
   decisionTitle:'Fast track ada syaratnya, bukan shortcut untuk semua merchant.',
   decisionBody:'Jelajahi routing di balik interface. Ini model penjelasan alur terdokumentasi, bukan sistem Admin Web aktif.',
   gate:'01 · ELIGIBILITY COHORT',
   gateQ:'Apakah submission menggunakan referral code SRC yang valid di backend?',
   yes:'Cohort SRC valid',
   no:'Tidak eligible',
   follow:'02 · HASIL FIRST REVIEW',
   followQ:'Apakah data dan dokumen merchant yang eligible sudah clear saat first review?',
   clear:'Clear case',
   exception:'Perlu deeper review',
   standardTitle:'KYB standar',
   standardDesc:'Merchant tetap mengikuti proses verifier → approver biasa. Jalur cepat partner tidak tersedia.',
   fastTitle:'Instant Approve · 1 pass',
   fastDesc:'Eligible clear case selesai pada first review tanpa mengulang approval pass kedua.',
   exceptionTitle:'Exception / secondary review',
   exceptionDesc:'Case bermasalah masuk review tambahan, remarks, atau corrective action, bukan otomatis approve.',
   blank:'Pilih eligibility cohort untuk melihat jalurnya.',
   reset:'Mulai lagi',
   viewUI:'Lihat desain Admin Web terkait',
   source:'Sumber: screenshot asli Admin Web AstraPay dan isi case study. Pilihan routing ini merupakan ilustrasi aturan operasional, bukan kontrol produksi yang ditiru.',
   outcomes:'Dokumen ini belum membuktikan penurunan waktu review, uplift fraud, atau kenaikan approval rate. Bukti mendukung rollout terbatas dan perubahan desain review—bukan efisiensi operasional terukur.',
   close:'Tutup layar ukuran penuh'
 }
}
function track(event,value){try{if(typeof window!=='undefined')window.umami?.track?.('kyb_fasttrack_'+event,{value})}catch{}}
export default function KybFastTrackShowcase({lang='en'}){
 const t=copy[lang]||copy.en
 const [selected,setSelected]=useState('onepage')
 const [zoom,setZoom]=useState(false)
 const [eligible,setEligible]=useState(null)
 const [isClear,setIsClear]=useState(null)
 const screen=screens.find(s=>s.key===selected)||screens[1]
 const detail=t.screens.find(s=>s.key===selected)||t.screens[1]
 const result=eligible===false?{title:t.standardTitle,description:t.standardDesc,type:'standard'}:eligible===true&&isClear===true?{title:t.fastTitle,description:t.fastDesc,type:'instant'}:eligible===true&&isClear===false?{title:t.exceptionTitle,description:t.exceptionDesc,type:'onepage'}:null
 const select=(key)=>{setSelected(key);track('artifact',key)}
 const changeEligible=(value)=>{setEligible(value);setIsClear(null);track('eligibility',String(value))}
 const changeClear=(value)=>{setIsClear(value);track('first_review',String(value))}
 useEffect(()=>{if(!zoom)return;const fn=e=>{if(e.key==='Escape')setZoom(false)};document.addEventListener('keydown',fn);return()=>document.removeEventListener('keydown',fn)},[zoom])
 return <section className={styles.root} aria-labelledby="kyb-fasttrack-title">
  <header className={styles.intro}>
   <span className={styles.eyebrow}>{t.eyebrow}</span>
   <h2 id="kyb-fasttrack-title">{t.title}</h2>
   <p>{t.intro}</p>
   <div className={styles.stats}>{t.stat.map(s=><div key={s.n}><strong>{s.n}</strong><span>{s.label}</span></div>)}</div>
   <p className={styles.qualifier}>{t.qualification}</p>
  </header>
  <div className={styles.exhibition}>
   <header><span className={styles.eyebrow}>{t.original}</span><h3>{t.visualTitle}</h3><p>{t.visualBody}</p></header>
   <div className={styles.stageTabs} role="group" aria-label={t.original}>
    {t.screens.map(s=><button type="button" key={s.key} onClick={()=>select(s.key)} aria-pressed={selected===s.key} className={selected===s.key?styles.active:''}>{s.label}</button>)}
   </div>
   <div className={styles.screen}>
    <button type="button" className={styles.screenButton} onClick={()=>setZoom(true)} aria-label={t.view+' · '+detail.heading}>
     <img src={screen.src} width={screen.width} height={screen.height} alt={detail.heading} loading={selected==='onepage'?'eager':'lazy'} />
     <span className={styles.zoom} aria-hidden="true">↗</span>
    </button>
   </div>
   <div className={styles.stageCaption}><div><span>{detail.note}</span><h4>{detail.heading}</h4><p>{detail.desc}</p></div><button type="button" onClick={()=>setZoom(true)}>{t.view} <span aria-hidden="true">↗</span></button></div>
   <div className={styles.takeaways}>{t.takeaways.map(s=><div key={s.n}><span>{s.n}</span><strong>{s.title}</strong><p>{s.body}</p></div>)}</div>
  </div>
  <div className={styles.routing}>
    <header><span className={styles.eyebrow}>{t.decisionLabel}</span><h3>{t.decisionTitle}</h3><p>{t.decisionBody}</p></header>
    <div className={styles.gate}>
     <span className={styles.gateLabel}>{t.gate}</span><h4>{t.gateQ}</h4>
     <div className={styles.choices}>
      <button type="button" aria-pressed={eligible===true} onClick={()=>changeEligible(true)}>{t.yes}</button>
      <button type="button" aria-pressed={eligible===false} onClick={()=>changeEligible(false)}>{t.no}</button>
     </div>
    </div>
    {eligible===true?<div className={styles.gate}>
     <span className={styles.gateLabel}>{t.follow}</span><h4>{t.followQ}</h4>
     <div className={styles.choices}>
      <button type="button" aria-pressed={isClear===true} onClick={()=>changeClear(true)}>{t.clear}</button>
      <button type="button" aria-pressed={isClear===false} onClick={()=>changeClear(false)}>{t.exception}</button>
     </div>
    </div>:null}
    {result?<div className={styles.result} role="status">
      <span aria-hidden="true">↳</span><div><h4>{result.title}</h4><p>{result.description}</p>
      {result.type!=='standard'?<button type="button" onClick={()=>{select(result.type);document.getElementById('kyb-fasttrack-title')?.scrollIntoView({behavior:'smooth'})}}>{t.viewUI} ↗</button>:null}
      </div>
    </div>:<p className={styles.hint}>{t.blank}</p>}
    <button type="button" className={styles.reset} onClick={()=>{setEligible(null);setIsClear(null)}}>↻ {t.reset}</button>
  </div>
  <p className={styles.outcomes}>{t.outcomes}</p>
  <p className={styles.source}>{t.source}</p>
  {zoom?<div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={detail.heading} onClick={()=>setZoom(false)}>
   <button type="button" className={styles.close} onClick={()=>setZoom(false)} aria-label={t.close}>✕</button>
   <img src={screen.src} width={screen.width} height={screen.height} alt={detail.heading} onClick={e=>e.stopPropagation()}/>
  </div>:null}
 </section>
}
