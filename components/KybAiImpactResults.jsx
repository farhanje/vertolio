'use client'
import {useState} from 'react'
import styles from './KybAiImpactResults.module.css'

const insights = {
  before: {submissions:229, issues:125, approved:82, decided:229},
  after: {submissions:163, issues:57, approved:90, decided:159},
  clean: {n:54, approved:41, issues:8},
  flagged: {n:71, approved:28, issues:40},
  noRecheck: {n:37, approved:11, issues:25},
  rechecked: {n:34, approved:17, issues:15},
}
const rate=(n,d)=>100*n/d
const translations={
  en:{
    eyebrow:'PRODUCTION RESULTS · MAY–JUN VS SEPT 2026',
    title:'36% fewer targeted KYB mismatches after stable rollout.',
    intro:'The combined rate for the three rejection reasons this pre-check was designed to catch declined in the clean before-and-after comparison.',
    before:'PRE · May–Jun',after:'POST · September',per100:'submissions with a targeted mismatch per 100 submissions',
    heroCaption:'Measured on all submitted KYBs, not only cases checked by AI.',
    approvedTitle:'Downstream approval rate',
    approvedText:'The approval rate also rose from 35.8% to 56.6% among decided applications. This is a directional observation, not a measured causal effect of the AI feature.',
    coverage:'129 of 163 September submissions had an AI pre-check (79.1% coverage). July and August were a pilot with uneven usage. October 1–21 was a partial follow-up and is excluded here.',
    signalLabel:'SIGNAL VS HUMAN REVIEW · SEPTEMBER 2026',
    signalTitle:'AI warnings were associated with reviewer findings.',
    signalIntro:'Among 125 AI-checked September submissions with a final decision, cases with no stored score below 70 were much more likely to be approved. Cases with at least one score below 70 were more likely to receive a targeted mismatch remark.',
    metricApproval:'Approval rate',
    metricMismatch:'Targeted mismatch rate',
    clean:'AI clean',flagged:'AI flagged',
    cleanN:'54 decided cases',flaggedN:'71 decided cases',
    signalTakeaway:'The model identified a useful risk signal. That does not mean a flagged case should automatically fail verification.',
    interactionLabel:'MERCHANT RESPONSE · FLAGGED CASES ONLY',
    interactionTitle:'Another pre-check was linked to better downstream outcomes.',
    interactionIntro:'Within the 71 AI-flagged decided cases, merchants who ran validation again had directionally better approval and targeted-mismatch results than those who checked only once.',
    once:'No recheck',again:'Rechecked',onceN:'37 cases',againN:'34 cases',
    interactionNote:'A recheck means more than one AI validation before submission. It does not confirm that the merchant edited their data. The groups are small, self-selected, and these differences are not conclusive at conventional statistical thresholds.',
    whyTitle:'Why the AI warns instead of blocks',
    whyNumber:'39.4%',whyText:'of AI-flagged cases were still approved by human reviewers (28 of 71).',
    whyBody:'A score below 70 was a caution signal, not an automatic rejection. The merchant could fix the submission or continue, and verification retained final authority. Human approval is not proof the AI made a false positive.',
    source:'Source: AstraPay KYB operational tables and reviewer remark analysis provided by the designer. PRE covers May–June 2026. July–August was an uneven pilot. POST is September 2026. Targeted remarks refer only to the three mapped BUSINESS_DATA rejection reasons. Rates are descriptive and do not establish causation.',
  },
  id:{
    eyebrow:'HASIL PRODUKSI · MEI–JUN VS SEPT 2026',
    title:'Targeted mismatch KYB turun 36% setelah rollout stabil.',
    intro:'Gabungan tiga rejection reason yang menjadi sasaran pre-check menunjukkan penurunan pada perbandingan sebelum dan setelah implementasi stabil.',
    before:'PRE · Mei–Jun',after:'POST · September',per100:'submission dengan targeted mismatch per 100 submission',
    heroCaption:'Dihitung dari semua KYB submitted, bukan hanya case yang diperiksa AI.',
    approvedTitle:'Approval rate downstream',
    approvedText:'Approval rate pada case yang sudah diputuskan juga naik dari 35,8% menjadi 56,6%. Ini observasi directional, bukan bukti kausal bahwa fitur AI menyebabkan kenaikan.',
    coverage:'129 dari 163 submission September memakai AI pre-check (coverage 79,1%). Juli dan Agustus masih pilot dengan traffic tidak merata. Periode 1–21 Oktober adalah follow-up parsial dan tidak termasuk perbandingan ini.',
    signalLabel:'SINYAL AI VS HUMAN REVIEW · SEPTEMBER 2026',
    signalTitle:'AI warning selaras dengan temuan reviewer.',
    signalIntro:'Dari 125 submission September yang diperiksa AI dan memiliki keputusan final, case tanpa stored score di bawah 70 memiliki approval lebih tinggi. Case dengan sedikitnya satu score di bawah 70 lebih sering menerima targeted mismatch remark.',
    metricApproval:'Approval rate',
    metricMismatch:'Targeted mismatch rate',
    clean:'AI clean',flagged:'AI flagged',
    cleanN:'54 case diputuskan',flaggedN:'71 case diputuskan',
    signalTakeaway:'Model memberikan sinyal risiko yang berguna. Temuan ini bukan alasan untuk otomatis menolak semua case yang flagged.',
    interactionLabel:'RESPONS MERCHANT · KHUSUS CASE FLAGGED',
    interactionTitle:'Validasi ulang berasosiasi dengan outcome yang lebih baik.',
    interactionIntro:'Di antara 71 case AI-flagged yang sudah diputuskan, merchant yang menjalankan validasi ulang menunjukkan approval dan targeted mismatch yang lebih baik secara directional dibandingkan merchant yang hanya sekali memeriksa.',
    once:'Tanpa recheck',again:'Rechecked',onceN:'37 case',againN:'34 case',
    interactionNote:'Recheck berarti lebih dari satu validasi AI sebelum submission. Ini tidak membuktikan merchant mengubah input. Kelompoknya kecil dan tidak teracak, sehingga perbedaannya belum konklusif secara statistik.',
    whyTitle:'Mengapa AI memberi warning, bukan memblokir',
    whyNumber:'39,4%',whyText:'case yang ditandai AI tetap di-approve oleh reviewer manusia (28 dari 71).',
    whyBody:'Score di bawah 70 adalah sinyal caution, bukan reject otomatis. Merchant bisa memperbaiki submission atau tetap lanjut, sementara verification tetap memegang keputusan akhir. Approval manusia tidak otomatis berarti finding AI salah.',
    source:'Sumber: analisis tabel operasional KYB AstraPay dan remark reviewer yang diberikan desainer. PRE adalah Mei–Juni 2026. Juli–Agustus masih pilot yang tidak merata. POST adalah September 2026. Targeted remarks hanya mengacu pada tiga rejection reason BUSINESS_DATA yang dipetakan. Angka bersifat deskriptif, bukan bukti kausal.',
  }
}
const fmt=(n,lang,digits=1)=>new Intl.NumberFormat(lang==='id'?'id-ID':'en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(n)
function PairBars({title,rows,lang,axis=100}){
 return <div className={styles.pair} role="group" aria-label={title}>
  <h4>{title}</h4>
  {rows.map(row=><div className={styles.compareRow} key={row.label}>
   <div className={styles.compareHeading}><span>{row.label}</span><strong>{fmt(row.value,lang)}%</strong></div>
   <div className={styles.barTrack}><div className={row.highlight?styles.barAccent:styles.barNeutral} style={{width:Math.min(100,row.value/axis*100)+'%'}}/></div>
   <small>{row.caption}</small>
  </div>)}
 </div>
}
export default function KybAiImpactResults({lang='en'}){
 const t=translations[lang]||translations.en
 const [metric,setMetric]=useState('approval')
 const mismatchPre=rate(insights.before.issues,insights.before.submissions)
 const mismatchPost=rate(insights.after.issues,insights.after.submissions)
 const reduction=(1-mismatchPost/mismatchPre)*100
 const metricKey=metric==='approval'?'approved':'issues'
 const display=(r)=>rate(r[metricKey],r.n)
 const chartName=metric==='approval'?t.metricApproval:t.metricMismatch
 const signalRows=[
  {label:t.clean,caption:t.cleanN,value:display(insights.clean),highlight:false},
  {label:t.flagged,caption:t.flaggedN,value:display(insights.flagged),highlight:true},
 ]
 const behaviorRows=[
  {label:t.once,caption:t.onceN,value:display(insights.noRecheck),highlight:false},
  {label:t.again,caption:t.againN,value:display(insights.rechecked),highlight:true},
 ]
 return <section className={styles.root} aria-labelledby="kyb-ai-impact-title">
   <div className={styles.heading}><span className={styles.eyebrow}>{t.eyebrow}</span><h2 id="kyb-ai-impact-title">{t.title}</h2><p>{t.intro}</p></div>
   <div className={styles.hero}>
    <div className={styles.mainMetric}><strong>−{fmt(reduction,lang,0)}%</strong><span>{t.per100}</span></div>
    <div className={styles.heroBars}>
     <PairBars lang={lang} axis={60} title={t.per100} rows={[
      {label:t.before,caption:'125 / 229',value:mismatchPre,highlight:false},
      {label:t.after,caption:'57 / 163',value:mismatchPost,highlight:true}
     ]}/>
    </div>
   </div>
   <p className={styles.heroCaption}>{t.heroCaption}</p>
   <div className={styles.outcomes}>
    <div className={styles.approval}><span className={styles.eyebrow}>{t.approvedTitle}</span><strong>{fmt(rate(insights.before.approved,insights.before.decided),lang)}% <span aria-hidden="true">→</span> {fmt(rate(insights.after.approved,insights.after.decided),lang)}%</strong><p>{t.approvedText}</p></div>
    <p className={styles.coverage}>{t.coverage}</p>
   </div>
   <div className={styles.sectionIntro}><span className={styles.eyebrow}>{t.signalLabel}</span><h3>{t.signalTitle}</h3><p>{t.signalIntro}</p></div>
   <div className={styles.toggle} role="group" aria-label="Choose comparison metric">
    <button type="button" aria-pressed={metric==='approval'} onClick={()=>setMetric('approval')}>{t.metricApproval}</button>
    <button type="button" aria-pressed={metric==='mismatch'} onClick={()=>setMetric('mismatch')}>{t.metricMismatch}</button>
   </div>
   <div className={styles.pairGrid}>
    <PairBars title={chartName} rows={signalRows} lang={lang}/>
    <div className={styles.signalAside}><strong>{t.signalTakeaway}</strong><span>{t.whyNumber}</span><p>{t.whyText}</p></div>
   </div>
   <div className={styles.sectionIntro}><span className={styles.eyebrow}>{t.interactionLabel}</span><h3>{t.interactionTitle}</h3><p>{t.interactionIntro}</p></div>
   <div className={styles.pairGrid}>
    <PairBars title={chartName} rows={behaviorRows} lang={lang}/>
    <div className={styles.guidance}><h4>{t.whyTitle}</h4><p>{t.whyBody}</p></div>
   </div>
   <p className={styles.caution}>{t.interactionNote}</p>
   <p className={styles.source}>{t.source}</p>
 </section>
}
