'use client'

import {useEffect, useState} from 'react'
import styles from './KybAiDecisionStory.module.css'

const cdn = 'https://cdn.sanity.io/images/iq6vjwu7/production/'
const captures = {
  form: {src: cdn+'7a9b18fc42e2fb580ddc45dbaa133b190fa62303-1440x1207.png', height:1207},
  checking: {src: cdn+'64f03577f2a52a25904e477294a3a1a985dd661b-1440x1231.png', height:1231},
  warning: {src: cdn+'cc8c4bb6d433718f1a76451aec446c6ce18772d3-1440x1231.png', height:1231},
  correction: {src: cdn+'a0b7dfc8f728887d40348ce534b566dcf0a4ee46-1440x1383.png', height:1383},
  incomplete: {src: cdn+'7f174db9fe4c75337f25edabc0d54e4e357daf97-1440x1231.png',height:1231},
  taxonomy: {src: cdn+'61f2695c065e9094a67fc13e668697aeced6b3ea-1529x328.png',width:1529,height:328},
}

const locales = {
  en: {
    eyebrow:'REAL PRODUCT UI · DESKTOP KYB',
    heading:'AI could flag a mismatch. The merchant still decided what to do.',
    subheading:'I designed how Llama findings become actionable warnings inside AstraPay’s existing KYB web dashboard, without turning an uncertain model output into an approval decision.',
    featuredLabel:'THE TWO CRITICAL STATES',
    warningTitle:'01 — Make the caution understandable',
    warningBody:'Four mapped caution groups appear together, with clear choices to fix the submission or continue.',
    correctionTitle:'02 — Connect the warning to its source',
    correctionBody:'Field-level messages and replace-file actions make corrections visible where the merchant can act.',
    open:'Inspect the original screenshot',
    guideLabel:'INTERACTIVE PRODUCT WALKTHROUGH',
    guideTitle:'See the actual pre-submission journey.',
    guideIntro:'All displayed dashboard screens are the original designs. Select a stage or follow its controls to inspect how the warning and correction work.',
    steps:{
      form:{label:'Business information',short:'Existing form',caption:'The pre-check is embedded in the existing business-information step, not a separate AI tool.'},
      checking:{label:'Checking',short:'Pre-submit check',caption:'After Continue, the dashboard shows a checking state while the submitted information is assessed.'},
      warning:{label:'Caution modal',short:'Four caution groups',caption:'The model findings are translated into grouped merchant-facing instructions, with correction and override choices.'},
      correction:{label:'Field corrections',short:'Actionable recovery',caption:'Messages appear beside the relevant business fields and uploaded photos rather than leaving the user at a generic warning.'},
      incomplete:{label:'Incomplete form',short:'Ordinary validation',caption:'The disabled Continue state belongs to normal form completion. It is not the same as an AI warning.'},
    },
    actions:{
      toCheck:'Continue to pre-check',
      toWarning:'Show the warning result',
      fix:'Perbaiki Data · Fix data',
      override:'Tetap Lanjut · Continue anyway',
      restart:'Restart walkthrough',
      review:'Back to warning',
      inspect:'Zoom original screen',
      dismiss:'Close image',
      next:'Inspect next state',
      incomplete:'Compare ordinary form validation',
    },
    overrideTitle:'Override is not AI approval',
    overrideBody:'The merchant can choose to continue despite the caution. The application proceeds to the usual KYB verification process; AI does not make the approval or rejection decision. No post-override screen was supplied, so this is an explanation, not a fabricated UI state.',
    resultNote:'This walkthrough does not run a model or submit a real KYB application. The checking-to-warning transition is manually controlled for portfolio inspection.',
    architecture:'The product rule behind the interface',
    taxonomyTitle:'One standardized message for each caution group.',
    taxonomyBody:'The grouping artifact documents how detailed finding conditions become stable user-facing copy: business-place photo, product photo, business-information mismatch, and non-direct or manipulated photos.',
    taxonomyAlt:'Original four-row caution mapping: finding conditions grouped into standardized merchant-facing messages.',
    taxonomyCta:'Inspect the caution-mapping artifact',
    guardrailTitle:'A decision boundary, not a verdict',
    guardrails:[
      {label:'AI finding',value:'Possible mismatch, not an automatic rejection'},
      {label:'Merchant choice',value:'Fix the flagged data or continue'},
      {label:'Final authority',value:'Normal human-led KYB verification'},
    ],
    outcome:'Observed after launch: targeted mismatch remarks fell 22–90% and approval rose by about 7%, with relatively stable submissions. These observations do not isolate causal impact from the AI pre-check.',
    source:'Original AstraPay KYB dashboard screenshots and original caution-group mapping supplied by the designer. UI copy remains in its original Indonesian.',
  },
  id: {
    eyebrow:'UI PRODUK ASLI · DASHBOARD KYB',
    heading:'AI menandai kemungkinan mismatch. Merchant tetap menentukan langkahnya.',
    subheading:'Saya merancang bagaimana temuan Llama menjadi warning yang bisa ditindaklanjuti dalam dashboard web KYB AstraPay, tanpa menjadikan output model sebagai keputusan approval.',
    featuredLabel:'DUA STATE PALING PENTING',
    warningTitle:'01 — Warning mudah dipahami',
    warningBody:'Empat kelompok caution ditampilkan bersama, dengan pilihan untuk memperbaiki submission atau tetap lanjut.',
    correctionTitle:'02 — Koreksi terhubung ke sumber masalah',
    correctionBody:'Pesan di level field dan aksi unggah ulang membuat perbaikan terlihat pada bagian yang tepat.',
    open:'Lihat screenshot asli secara penuh',
    guideLabel:'WALKTHROUGH PRODUK INTERAKTIF',
    guideTitle:'Coba alur sebenarnya sebelum submission.',
    guideIntro:'Seluruh layar dashboard menggunakan desain asli. Pilih tahap atau ikuti kontrolnya untuk melihat bagaimana warning dan koreksi bekerja.',
    steps:{
      form:{label:'Informasi bisnis',short:'Form yang ada',caption:'Pre-check masuk ke step Informasi Bisnis yang sudah ada, bukan tool AI terpisah.'},
      checking:{label:'Pemeriksaan',short:'Cek sebelum submit',caption:'Setelah Lanjutkan, dashboard menampilkan status pemeriksaan terhadap informasi yang diajukan.'},
      warning:{label:'Modal peringatan',short:'Empat grup caution',caption:'Temuan model diterjemahkan menjadi pesan yang dikelompokkan, dengan opsi perbaikan dan tetap lanjut.'},
      correction:{label:'Koreksi field',short:'Perbaikan terarah',caption:'Pesan tampil pada field dan foto yang relevan, bukan hanya memberi warning generik.'},
      incomplete:{label:'Form belum lengkap',short:'Validasi form biasa',caption:'Tombol Lanjutkan yang nonaktif berkaitan dengan kelengkapan form, bukan warning AI.'},
    },
    actions:{
      toCheck:'Lanjutkan ke pre-check',
      toWarning:'Tampilkan hasil warning',
      fix:'Perbaiki Data',
      override:'Tetap Lanjut',
      restart:'Ulangi alur',
      review:'Kembali ke warning',
      inspect:'Perbesar screenshot asli',
      dismiss:'Tutup gambar',
      next:'Lihat state berikutnya',
      incomplete:'Bandingkan validasi form biasa',
    },
    overrideTitle:'Override bukan approval AI',
    overrideBody:'Merchant boleh tetap lanjut meski ada warning. Aplikasi masuk ke proses verifikasi KYB biasa; AI tidak menentukan approve atau reject. Karena screenshot setelah override tidak tersedia, bagian ini berupa penjelasan, bukan UI yang dibuat-buat.',
    resultNote:'Walkthrough ini tidak menjalankan model atau mengirim aplikasi KYB sungguhan. Transisi dari loading ke warning dijalankan manual untuk kebutuhan demonstrasi portofolio.',
    architecture:'Product rule di balik interface',
    taxonomyTitle:'Satu pesan konsisten untuk setiap grup caution.',
    taxonomyBody:'Artefak grouping menunjukkan bagaimana finding yang lebih detail dipetakan ke user-facing copy yang stabil: foto tempat usaha, foto produk, informasi bisnis, dan foto bukan hasil pengambilan langsung atau hasil manipulasi.',
    taxonomyAlt:'Artefak asli pemetaan empat grup caution dari finding condition menjadi copy untuk merchant.',
    taxonomyCta:'Lihat artefak caution mapping',
    guardrailTitle:'Batas keputusan, bukan vonis',
    guardrails:[
      {label:'Finding AI',value:'Potensi mismatch, bukan reject otomatis'},
      {label:'Pilihan merchant',value:'Perbaiki data atau tetap lanjut'},
      {label:'Keputusan final',value:'Verification KYB oleh manusia'},
    ],
    outcome:'Setelah rilis, targeted mismatch remarks turun 22–90% dan approval rate bergerak naik sekitar 7%, dengan submission relatif stabil. Observasi ini tidak memisahkan dampak kausal fitur AI.',
    source:'Screenshot asli dashboard KYB AstraPay dan artefak grouping caution asli yang diberikan desainer. Copy pada UI tetap memakai Bahasa Indonesia aslinya.',
  },
}

const order=['form','checking','warning','correction']
const srcFor=key=>captures[key] || captures.warning
const hotspotByState={
  form:[{to:'checking',left:35.5,top:89.5,width:10,height:4.2}],
  warning:[
    {to:'correction',left:31.1,top:57.4,width:30.8,height:3.8},
    {to:'override',left:31.1,top:61.5,width:30.8,height:4.3},
  ],
}
function log(event, state) {
  try{if(typeof window!=='undefined')window.umami?.track?.('kyb_ai_real_ui_'+event,{state})}catch{}
}

function Capture({capture,alt,onZoom,className,loading='lazy'}) {
  return <button className={className} type="button" onClick={onZoom} aria-label={alt}>
    <img src={capture.src} alt={alt} width={capture.width||1440} height={capture.height} loading={loading} />
    <span aria-hidden="true" className={styles.zoomIcon}>↗</span>
  </button>
}

export default function KybAiDecisionStory({lang='en'}) {
  const t=locales[lang]||locales.en
  const [active,setActive]=useState('form')
  const [zoom,setZoom]=useState(null)
  const stage=active==='override'?'warning':active
  const selected=srcFor(stage)
  const selectedStep=t.steps[stage]
  useEffect(()=>{
    if(!zoom)return
    const key=(ev)=>{if(ev.key==='Escape')setZoom(null)}
    document.addEventListener('keydown',key)
    return ()=>document.removeEventListener('keydown',key)
  },[zoom])
  const go=(state)=>{setActive(state);log('navigate',state)}
  const zoomCapture=(screen)=>{setZoom(screen);log('zoom',screen)}
  return <section className={styles.root} aria-labelledby="kyb-ai-real-heading">
    <header className={styles.top}>
      <span className={styles.eyebrow}>{t.eyebrow}</span>
      <h2 id="kyb-ai-real-heading">{t.heading}</h2>
      <p>{t.subheading}</p>
    </header>

    <div className={styles.featured}>
      <span className={styles.sectionEyebrow}>{t.featuredLabel}</span>
      <div className={styles.featuredGrid}>
        <figure>
          <Capture capture={captures.warning} alt={t.open+' · '+t.warningTitle} className={`${styles.featureShot} ${styles.warningFocus}`} onZoom={()=>zoomCapture('warning')} loading="eager"/>
          <figcaption><span>01</span><div><strong>{t.warningTitle}</strong><p>{t.warningBody}</p></div></figcaption>
        </figure>
        <figure>
          <Capture capture={captures.correction} alt={t.open+' · '+t.correctionTitle} className={`${styles.featureShot} ${styles.correctionFocus}`} onZoom={()=>zoomCapture('correction')} loading="eager"/>
          <figcaption><span>02</span><div><strong>{t.correctionTitle}</strong><p>{t.correctionBody}</p></div></figcaption>
        </figure>
      </div>
    </div>

    <div className={styles.walkthrough}>
      <header className={styles.walkHeader}>
        <span className={styles.eyebrow}>{t.guideLabel}</span>
        <h3>{t.guideTitle}</h3>
        <p>{t.guideIntro}</p>
      </header>
      <nav className={styles.stageNav} aria-label={t.guideTitle}>
        {order.map((step,i)=><button type="button" key={step} className={active===step?styles.chosen:''} aria-current={active===step?'step':undefined} onClick={()=>go(step)}>
          <span>{String(i+1).padStart(2,'0')}</span>{t.steps[step].label}
        </button>)}
      </nav>
      <div className={styles.walkGrid}>
        <div className={styles.screenSide}>
          <div className={styles.screenHead}>
            <span>{selectedStep?.short}</span>
            <button type="button" onClick={()=>zoomCapture(stage)} aria-label={t.actions.inspect}>{t.actions.inspect} ↗</button>
          </div>
          <div className={styles.screenFrame}>
            <img src={selected.src} alt={selectedStep?.label||t.steps.warning.label} width="1440" height={selected.height}/>
            {(hotspotByState[stage]||[]).map((hotspot,i)=><button key={i} type="button" className={styles.hotspot}
              style={{left:hotspot.left+'%',top:hotspot.top+'%',width:hotspot.width+'%',height:hotspot.height+'%'}}
              onClick={()=>go(hotspot.to)}
              aria-label={hotspot.to==='checking'?t.actions.toCheck:hotspot.to==='correction'?t.actions.fix:t.actions.override}
              title={hotspot.to==='checking'?t.actions.toCheck:hotspot.to==='correction'?t.actions.fix:t.actions.override}
            />)}
          </div>
        </div>
        <aside className={styles.details}>
          <span className={styles.detailsEyebrow}>{selectedStep?.label}</span>
          <p>{active==='override'?t.overrideBody:selectedStep?.caption}</p>
          {active==='override'?<div className={styles.overrideNote}>
            <strong>{t.overrideTitle}</strong>
            <p>{t.overrideBody}</p>
          </div>:null}
          <div className={styles.controls}>
            {active==='form'?<button type="button" onClick={()=>go('checking')}>{t.actions.toCheck} <span aria-hidden="true">→</span></button>:null}
            {active==='checking'?<button type="button" onClick={()=>go('warning')}>{t.actions.toWarning} <span aria-hidden="true">→</span></button>:null}
            {active==='warning'?<>
              <button type="button" onClick={()=>go('correction')}>{t.actions.fix} <span aria-hidden="true">→</span></button>
              <button type="button" onClick={()=>go('override')} className={styles.secondary}>{t.actions.override} <span aria-hidden="true">↗</span></button>
            </>:null}
            {active==='correction'||active==='override'?<button type="button" className={styles.secondary} onClick={()=>go('warning')}>{t.actions.review} <span aria-hidden="true">↶</span></button>:null}
            {active==='incomplete'?<button type="button" className={styles.secondary} onClick={()=>go('form')}>{t.actions.restart} ↶</button>:null}
            <button className={styles.ghost} type="button" onClick={()=>go('form')}>↻ {t.actions.restart}</button>
          </div>
          <div className={styles.interactionNote}>{t.resultNote}</div>
        </aside>
      </div>
      <div className={styles.validation}>
        <button type="button" onClick={()=>go('incomplete')}>{t.actions.incomplete} <span aria-hidden="true">↗</span></button>
        <span>{t.steps.incomplete.caption}</span>
      </div>
    </div>

    <div className={styles.mapping}>
      <div className={styles.mapIntro}>
        <span className={styles.eyebrow}>{t.architecture}</span>
        <h3>{t.taxonomyTitle}</h3>
        <p>{t.taxonomyBody}</p>
      </div>
      <Capture capture={captures.taxonomy} alt={t.taxonomyAlt} className={styles.taxonomyImage} onZoom={()=>zoomCapture('taxonomy')}/>
      <p className={styles.taxonomyHelp}>{t.taxonomyCta} ↗</p>
    </div>

    <div className={styles.guardrails}>
      <h3>{t.guardrailTitle}</h3>
      <div className={styles.guardrailGrid}>
        {t.guardrails.map((item,i)=><div key={item.label}><span>{String(i+1).padStart(2,'0')}</span><strong>{item.label}</strong><p>{item.value}</p></div>)}
      </div>
      <p className={styles.outcome}>{t.outcome}</p>
    </div>
    <p className={styles.source}>{t.source}</p>
    {zoom?<div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={t.actions.inspect} onClick={()=>setZoom(null)}>
      <button type="button" className={styles.close} onClick={()=>setZoom(null)} aria-label={t.actions.dismiss}>✕</button>
      <img src={srcFor(zoom).src} alt={zoom==='taxonomy'?t.taxonomyAlt:(t.steps[zoom]?.label||t.steps.warning.label)} width={zoom==='taxonomy'?1529:1440} height={srcFor(zoom).height} onClick={ev=>ev.stopPropagation()}/>
    </div>:null}
  </section>
}
