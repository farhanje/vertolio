'use client'

import {useState} from 'react'
import styles from './KybAiDecisionStory.module.css'

const dictionary = {
  en: {
    eyebrow:'THE DESIGN DECISION · WEB DASHBOARD',
    headline:'Turn AI findings into decisions merchants can act on.',
    subhead:'The challenge was not drawing another dashboard screen. It was defining what an uncertain model finding should mean for the merchant, the product, and the verification team.',
    metrics:[
      {value:'22–90%',label:'Fewer targeted mismatch remarks'},
      {value:'~7%',label:'Observed approval-rate movement'},
      {value:'Stable',label:'Submission volume, approximately'},
    ],
    observation:'Post-launch observational results. These figures are not an isolated causal estimate of the AI feature.',
    archTitle:'The decision boundary',
    roles:[
      {label:'Merchant · KYB dashboard',desc:'Enters business information and uploads supporting photos'},
      {label:'Llama via Vertex AI',desc:'Identifies possible mismatches in the submitted inputs'},
      {label:'Product rules',desc:'Normalize a finding and select a stable merchant instruction'},
      {label:'Merchant action',desc:'Correct the flagged input or continue despite the warning'},
      {label:'Normal verification',desc:'Human-led review retains final approval/rejection authority'},
    ],
    explorerEyebrow:'INTERACTIVE DECISION EXPLORER',
    explorerTitle:'One pre-check, several outcomes.',
    explorerIntro:'Explore the condition families the team targeted. The wording below describes the decision logic; it is not a reproduction of the exact shipped dashboard copy.',
    categories:[
      {
        key:'storefront', short:'Business-place photo',
        example:'A photo is too dark, shows only the interior, or does not clearly show the storefront.',
        finding:'Business-place photo may not clearly represent the registered business.',
        merchant:'Review the business-place photo and use the existing upload guidance.',
        correction:'Return to the business-place photo input, replace the photo where needed, then continue the application.',
      },
      {
        key:'product',short:'Product photo',
        example:'The uploaded product photo may not adequately correspond to the business information.',
        finding:'Product photo and business information may not align.',
        merchant:'Check that the product photo represents the business being registered.',
        correction:'Return to the product photo input, review or replace the photo, then continue the application.',
      },
      {
        key:'name',short:'Business name',
        example:'The submitted name may not be consistent with the information or visual evidence.',
        finding:'Business name may be inconsistent with the submitted evidence.',
        merchant:'Recheck the business name against the information and evidence provided.',
        correction:'Return to the relevant business information field, correct it if needed, then continue the application.',
      },
      {
        key:'clear',short:'No actionable finding',
        example:'The pre-check does not flag a defined condition that needs the merchant’s attention.',
        finding:'No mapped warning needed.',
        merchant:'Continue to the normal KYB submission.',
        correction:'No correction is required by the pre-check.',
      },
    ],
    labelExample:'EXAMPLE REASON FAMILY',
    labelFinding:'MODEL FINDING · INTERPRETED',
    labelMessage:'PRODUCT-LEVEL FEEDBACK',
    actionsTitle:'Who controls the next step?',
    fix:'Correct flagged information',
    override:'Continue despite warning',
    noWarning:'Proceed to submission',
    reset:'Reset choice',
    choose:'Choose one of the paths to examine the decision boundary.',
    fixedTitle:'Correction path',
    bypassTitle:'Override path',
    clearTitle:'No-warning path',
    fixed:'The merchant returns to the relevant input and decides how to correct it. AI does not approve the merchant.',
    bypass:'The warning is non-blocking. The merchant can continue if they believe the information is right; this does not mean automatic KYB approval.',
    clean:'With no mapped finding, the pre-check adds no warning and the merchant proceeds normally.',
    verification:'All paths lead to the standard KYB verification process. A human-led verification decision remains authoritative.',
    disclosure:'This is an interactive explanation of the product rules—not a working merchant dashboard, a live model, or a screenshot of shipped UI.',
  },
  id: {
    eyebrow:'KEPUTUSAN DESAIN · WEB DASHBOARD',
    headline:'Ubah temuan AI menjadi keputusan yang bisa ditindaklanjuti merchant.',
    subhead:'Tantangannya bukan menggambar layar dashboard baru. Tantangannya adalah menentukan arti sebuah finding yang belum pasti bagi merchant, product layer, dan tim verification.',
    metrics:[
      {value:'22–90%',label:'Penurunan targeted mismatch remarks'},
      {value:'~7%',label:'Perubahan approval rate teramati'},
      {value:'Stabil',label:'Volume submission relatif'},
    ],
    observation:'Hasil observasional setelah rilis. Angka ini bukan estimasi dampak kausal terisolasi dari fitur AI.',
    archTitle:'Batas keputusan masing-masing pihak',
    roles:[
      {label:'Merchant · Dashboard KYB',desc:'Mengisi informasi usaha dan mengunggah foto pendukung'},
      {label:'Llama melalui Vertex AI',desc:'Mencari kemungkinan mismatch pada input yang dikirim'},
      {label:'Product rules',desc:'Mengelompokkan finding dan memilih instruksi yang konsisten'},
      {label:'Aksi merchant',desc:'Memperbaiki input yang ditandai atau tetap melanjutkan'},
      {label:'Verification biasa',desc:'Proses peninjauan manusia tetap menentukan approve/reject'},
    ],
    explorerEyebrow:'EKSPLORASI DECISION LOGIC',
    explorerTitle:'Satu pre-check, beberapa kemungkinan.',
    explorerIntro:'Lihat kategori kondisi yang ditargetkan tim. Kalimat di bawah menjelaskan logika keputusan, bukan salinan persis copy dashboard yang dirilis.',
    categories:[
      {
        key:'storefront',short:'Foto tempat usaha',
        example:'Foto terlalu gelap, hanya menampilkan interior, atau tidak cukup memperlihatkan storefront.',
        finding:'Foto tempat usaha mungkin belum mewakili bisnis yang didaftarkan secara jelas.',
        merchant:'Periksa kembali foto tempat usaha menggunakan panduan upload yang sudah tersedia.',
        correction:'Kembali ke input foto tempat usaha, ganti foto bila diperlukan, lalu lanjutkan pengajuan.',
      },
      {
        key:'product',short:'Foto produk',
        example:'Foto produk yang diunggah mungkin belum sesuai dengan informasi usaha.',
        finding:'Ada kemungkinan mismatch antara foto produk dan informasi bisnis.',
        merchant:'Periksa apakah foto produk mencerminkan usaha yang didaftarkan.',
        correction:'Kembali ke input foto produk, tinjau atau ganti foto, lalu lanjutkan pengajuan.',
      },
      {
        key:'name',short:'Nama usaha',
        example:'Nama usaha yang diisi mungkin tidak selaras dengan informasi atau bukti visual.',
        finding:'Nama bisnis mungkin tidak konsisten dengan bukti yang diberikan.',
        merchant:'Periksa lagi nama usaha dan kesesuaiannya dengan informasi serta bukti yang disertakan.',
        correction:'Kembali ke kolom informasi bisnis yang relevan, ubah bila perlu, lalu lanjutkan pengajuan.',
      },
      {
        key:'clear',short:'Tanpa temuan',
        example:'Tidak ada kondisi terdefinisi yang perlu diperhatikan merchant.',
        finding:'Tidak ada warning yang perlu ditampilkan.',
        merchant:'Lanjutkan submission KYB seperti biasa.',
        correction:'Tidak ada koreksi yang diminta oleh pre-check.',
      },
    ],
    labelExample:'CONTOH KATEGORI PENYEBAB',
    labelFinding:'FINDING MODEL · INTERPRETASI',
    labelMessage:'FEEDBACK DI LEVEL PRODUK',
    actionsTitle:'Siapa yang menentukan langkah berikutnya?',
    fix:'Perbaiki informasi',
    override:'Tetap lanjut meski ada warning',
    noWarning:'Lanjutkan submission',
    reset:'Ulangi pilihan',
    choose:'Pilih salah satu jalur untuk melihat batas keputusan.',
    fixedTitle:'Jalur koreksi',
    bypassTitle:'Jalur override',
    clearTitle:'Tanpa warning',
    fixed:'Merchant kembali ke input terkait dan memutuskan perbaikannya. AI tidak memberikan persetujuan merchant.',
    bypass:'Warning tidak memblokir. Merchant dapat lanjut jika merasa datanya benar; ini bukan berarti KYB otomatis disetujui.',
    clean:'Tanpa finding terdefinisi, pre-check tidak menambah warning dan merchant melanjutkan proses seperti biasa.',
    verification:'Semua jalur tetap masuk proses verification KYB normal. Keputusan akhirnya tetap berada pada proses peninjauan manusia.',
    disclosure:'Ini penjelasan interaktif product rules, bukan dashboard merchant yang berfungsi, live model, atau screenshot UI yang dirilis.',
  },
}
function track(name,value) {
  try {if(typeof window!=='undefined')window.umami?.track?.('kyb_ai_decision_'+name,{selection:value})} catch {}
}
export default function KybAiDecisionStory({lang='en'}) {
  const t=dictionary[lang]||dictionary.en
  const [key,setKey]=useState('storefront')
  const [choice,setChoice]=useState(null)
  const data=t.categories.find(x=>x.key===key)||t.categories[0]
  const chooseCategory=(next)=>{setKey(next);setChoice(null);track('condition',next)}
  const chooseAction=(action)=>{setChoice(action);track('action',action)}
  const resultTitle=choice==='fix'?t.fixedTitle:choice==='override'?t.bypassTitle:t.clearTitle
  const resultBody=choice==='fix'?data.correction+' '+t.fixed:choice==='override'?t.bypass:t.clean
  return (
    <section className={styles.root} aria-label={t.headline}>
      <header className={styles.intro}>
        <div className={styles.introCopy}>
          <span className={styles.eyebrow}>{t.eyebrow}</span>
          <h2>{t.headline}</h2>
          <p>{t.subhead}</p>
        </div>
        <div className={styles.metrics} aria-label="Observed outcomes">
          {t.metrics.map(m=><div className={styles.metric} key={m.label}><strong>{m.value}</strong><span>{m.label}</span></div>)}
        </div>
      </header>
      <p className={styles.observation}>{t.observation}</p>
      <div className={styles.boundary}>
        <h3>{t.archTitle}</h3>
        <ol className={styles.roles}>
          {t.roles.map((r,i)=><li key={r.label}>
            <span className={styles.index}>{String(i+1).padStart(2,'0')}</span>
            <strong>{r.label}</strong>
            <small>{r.desc}</small>
          </li>)}
        </ol>
      </div>
      <div className={styles.explorer}>
        <header>
          <span className={styles.eyebrow}>{t.explorerEyebrow}</span>
          <h3>{t.explorerTitle}</h3>
          <p>{t.explorerIntro}</p>
        </header>
        <div className={styles.scenarioNav} role="group" aria-label={t.explorerTitle}>
          {t.categories.map(c=><button type="button" key={c.key} aria-pressed={key===c.key} onClick={()=>chooseCategory(c.key)} className={key===c.key?styles.selected:''}>{c.short}</button>)}
        </div>
        <div className={styles.mapping}>
          <div><span className={styles.mapLabel}>{t.labelExample}</span><p>{data.example}</p></div>
          <div><span className={styles.mapLabel}>{t.labelFinding}</span><p>{data.finding}</p></div>
          <div><span className={styles.mapLabel}>{t.labelMessage}</span><p>{data.merchant}</p></div>
        </div>
        <div className={styles.actions}>
          <div className={styles.actionHeading}>{t.actionsTitle}</div>
          <div className={styles.actionButtons}>
            {key==='clear' ? (
              <button type="button" onClick={()=>chooseAction('clear')} aria-pressed={choice==='clear'}>{t.noWarning} <span aria-hidden="true">↗</span></button>
            ):<>
              <button type="button" onClick={()=>chooseAction('fix')} aria-pressed={choice==='fix'}>{t.fix} <span aria-hidden="true">↗</span></button>
              <button type="button" onClick={()=>chooseAction('override')} aria-pressed={choice==='override'}>{t.override} <span aria-hidden="true">↗</span></button>
            </>}
          </div>
          {choice ? <div className={styles.result} role="status">
            <div className={styles.resultHead}><strong>{resultTitle}</strong><button type="button" onClick={()=>setChoice(null)}>{t.reset}</button></div>
            <p>{resultBody}</p>
            <div className={styles.verification}><span aria-hidden="true">→</span><strong>{t.verification}</strong></div>
          </div>:<p className={styles.invitation}>{t.choose}</p>}
        </div>
      </div>
      <p className={styles.disclosure}>{t.disclosure}</p>
    </section>
  )
}
