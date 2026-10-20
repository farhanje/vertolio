'use client'

import {useEffect, useState} from 'react'
import styles from './KycExperimentSnapshot.module.css'

const CDN='https://cdn.sanity.io/images/iq6vjwu7/production/'
const assets={
  variants:{src:CDN+'e781ed265956fa9da8b36142c804a634e916c4a9-1528x906.png',width:1528,height:906},
  results:{src:CDN+'416bad609efc7ab50e5230e26a4743ddf5e42f67-1448x1086.png',width:1448,height:1086},
}
const copy={
 en:{
  eyebrow:'SUPPORTING CASE STUDY · PRODUCTION EXPERIMENT',
  headline:'Three KYC messages. One decision under uncertainty.',
  intro:'With UX Writing, I tested whether a different reason to upgrade could get more people to begin KYC—while checking what happened all the way to submission.',
  thesis:'Three distinct value propositions, not three cosmetic rewrites.',
  options:[
   {key:'A',label:'Feature highlight',desc:'Transfer and cash-withdrawal access after upgrading'},
   {key:'B',label:'General highlight',desc:'Frame the existing account as limited until upgrading'},
   {key:'C',label:'Monetary highlight',desc:'A Rp100k voucher as a concrete reason to upgrade'},
  ],
  selected:'Selected message strategy',
  factTitle:'What the test actually supported',
  facts:[
   {value:'+1.22%',label:'C vs A at KYC Start',note:'Holm-adjusted p ≈ 0.016; significant'},
   {value:'37.36%',label:'Highest final CVR: B',note:'Descriptive lead, not a proven winner'},
   {value:'Not significant',label:'Final CVR across A, B and C',note:'All pairwise p ≥ 0.40'},
  ],
  decisionEyebrow:'THE PRODUCT DECISION',
  decision:'Recommend C for stronger entry response without a detected final-conversion disadvantage.',
  decisionDesc:'B was slightly ahead on final CVR, but that difference was not statistically significant. The team prioritized submission volume, and the recommendation for C went through senior review and CMO confirmation.',
  artifactLabel:'Original experiment artifacts',
  artifactIntro:'Inspect the actual variant-comparison board and the production results. The selector above summarizes each framing; it does not replace or alter the original tested creative.',
  variants:'Creative variants',
  results:'Experiment results',
  inspect:'Inspect full-resolution original',
  attribution:'A, B and C were assigned to users on the new build by user ID modulo three. The old-build legacy cohort was concurrent but not part of that randomization.',
  caveat:'A separate comparison of the new build with legacy also included the Flexible KYC/Autosave release. It cannot establish that copy alone caused the observed rollout uplift.',
  connected:'Related project',
  autosave:'Flexible KYC and Autosave →',
  close:'Close full-resolution image',
 },
 id:{
  eyebrow:'CASE STUDY PENDUKUNG · EKSPERIMEN PRODUKSI',
  headline:'Tiga pesan KYC. Satu keputusan saat buktinya tidak mutlak.',
  intro:'Bersama UX Writing, saya menguji apakah alasan upgrade yang berbeda bisa membuat lebih banyak pengguna memulai KYC—sekaligus memeriksa apa yang terjadi hingga submission.',
  thesis:'Tiga value proposition berbeda, bukan tiga variasi copy kosmetik.',
  options:[
   {key:'A',label:'Feature highlight',desc:'Akses transfer dan tarik tunai setelah upgrade'},
   {key:'B',label:'General highlight',desc:'Akun terasa terbatas sebelum pengguna melakukan upgrade'},
   {key:'C',label:'Monetary highlight',desc:'Voucher Rp100k sebagai alasan konkret untuk upgrade'},
  ],
  selected:'Pendekatan pesan yang dipilih',
  factTitle:'Apa yang benar-benar didukung eksperimen',
  facts:[
   {value:'+1,22%',label:'C vs A pada KYC Start',note:'p ≈ 0,016 setelah koreksi Holm; signifikan'},
   {value:'37,36%',label:'Final CVR tertinggi: B',note:'Unggul secara deskriptif, bukan pemenang teruji'},
   {value:'Tidak signifikan',label:'Final CVR A, B, dan C',note:'Seluruh pairwise p ≥ 0,40'},
  ],
  decisionEyebrow:'KEPUTUSAN PRODUK',
  decision:'Rekomendasikan C karena respons awal lebih tinggi, tanpa penurunan final conversion yang terdeteksi.',
  decisionDesc:'Final CVR B sedikit lebih tinggi, tetapi perbedaannya tidak signifikan. KPI tim berfokus pada volume submission; rekomendasi C melewati review senior dan konfirmasi CMO.',
  artifactLabel:'Artefak eksperimen asli',
  artifactIntro:'Lihat papan variasi pesan dan hasil eksperimen produksi. Pilihan di atas merangkum pendekatannya, bukan menggantikan atau mengubah creative yang diuji.',
  variants:'Variasi pesan',
  results:'Hasil eksperimen',
  inspect:'Perbesar artefak asli',
  attribution:'A, B, dan C dibagi untuk pengguna new build berdasarkan user ID modulo tiga. Cohort legacy old build berjalan bersamaan, tetapi tidak termasuk randomisasi tersebut.',
  caveat:'Perbandingan lain antara new build dan legacy juga mengandung perubahan Flexible KYC/Autosave. Uplift rollout tidak dapat diatribusikan hanya pada perubahan copy.',
  connected:'Proyek terkait',
  autosave:'Flexible KYC dan Autosave →',
  close:'Tutup artefak',
 }
}
function track(event,value){try{if(typeof window!=='undefined')window.umami?.track?.('kyc_experiment_'+event,{value})}catch{}}

export default function KycExperimentSnapshot({lang='en'}){
 const t=copy[lang]||copy.en
 const [arm,setArm]=useState('C')
 const [artifact,setArtifact]=useState('variants')
 const [zoom,setZoom]=useState(false)
 const chosen=t.options.find(item=>item.key===arm)||t.options[2]
 const image=assets[artifact]
 useEffect(()=>{
  if(!zoom)return
  const key=(e)=>{if(e.key==='Escape')setZoom(false)}
  document.addEventListener('keydown',key)
  return()=>document.removeEventListener('keydown',key)
 },[zoom])
 return <section className={styles.root} aria-labelledby="ab-kyc-title">
  <div className={styles.intro}>
   <span className={styles.eyebrow}>{t.eyebrow}</span>
   <h2 id="ab-kyc-title">{t.headline}</h2>
   <p>{t.intro}</p>
  </div>
  <div className={styles.choices}>
   <h3>{t.thesis}</h3>
   <div className={styles.optionGrid} role="group" aria-label={t.selected}>
    {t.options.map(option=><button key={option.key} type="button" aria-pressed={arm===option.key} onClick={()=>{setArm(option.key);track('arm',option.key)}}>
      <span className={styles.optionKey}>{option.key}</span>
      <strong>{option.label}</strong>
      <span>{option.desc}</span>
    </button>)}
   </div>
  </div>
  <div className={styles.evidence}>
   <div className={styles.results}>
    <span className={styles.eyebrow}>{t.factTitle}</span>
    {t.facts.map((fact,i)=><div className={styles.fact} key={fact.label}><strong className={i===2?styles.qualitative:''}>{fact.value}</strong><span>{fact.label}</span><small>{fact.note}</small></div>)}
   </div>
   <div className={styles.decision}>
    <span className={styles.eyebrow}>{t.decisionEyebrow}</span>
    <h3>{t.decision}</h3>
    <p>{t.decisionDesc}</p>
    <div className={styles.armConclusion}><span>{arm}</span><div><small>{chosen.label}</small><p>{chosen.desc}</p></div></div>
   </div>
  </div>
  <div className={styles.original}>
   <div className={styles.originalHeader}>
    <div><span className={styles.eyebrow}>{t.artifactLabel}</span><p>{t.artifactIntro}</p></div>
    <div className={styles.switch} role="group" aria-label={t.artifactLabel}>
     {['variants','results'].map(key=><button type="button" key={key} aria-pressed={artifact===key} onClick={()=>{setArtifact(key);track('artifact',key)}}>{t[key]}</button>)}
    </div>
   </div>
   <button className={styles.artImage} type="button" onClick={()=>{setZoom(true);track('zoom',artifact)}} aria-label={t.inspect}>
    <img src={image.src} alt={artifact==='variants'?t.variants:t.results} width={image.width} height={image.height} loading="lazy"/>
    <span aria-hidden="true">↗</span>
   </button>
   <p className={styles.caveat}>{t.attribution} {t.caveat}</p>
   <a href="/work/kyc-autosave-astrapay" className={styles.related}><span>{t.connected}</span>{t.autosave}</a>
  </div>
  {zoom?<div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={t.inspect} onClick={()=>setZoom(false)}>
   <button type="button" className={styles.close} aria-label={t.close} onClick={()=>setZoom(false)}>✕</button>
   <img src={image.src} width={image.width} height={image.height} alt={artifact==='variants'?t.variants:t.results} onClick={e=>e.stopPropagation()}/>
  </div>:null}
 </section>
}
