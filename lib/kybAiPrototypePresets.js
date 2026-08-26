const blue = '#1557E8'
const text = '#222222'
const muted = '#666666'
const line = '#E4E4E4'
const soft = '#F7F8FA'

function svgUrl(body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="654" viewBox="0 0 360 654">
    <rect width="360" height="654" fill="#fff"/>
    <style>
      text{font-family:Arial,Helvetica,sans-serif;fill:${text}}
      .small{font-size:11px}.body{font-size:13px}.label{font-size:12px;fill:${muted}}.title{font-size:19px;font-weight:700}.bold{font-weight:700}.muted{fill:${muted}}
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

function primary(label, y = 574) {
  return `<rect x="24" y="${y}" width="312" height="44" rx="9" fill="${blue}"/><text x="180" y="${y + 28}" text-anchor="middle" class="body bold" style="fill:#fff">${label}</text>`
}

function secondary(label, y = 522) {
  return `<rect x="24" y="${y}" width="312" height="44" rx="9" fill="#fff" stroke="${blue}"/><text x="180" y="${y + 28}" text-anchor="middle" class="body bold" style="fill:${blue}">${label}</text>`
}

function field(label, value, y) {
  return `<text x="24" y="${y}" class="label">${label}</text><rect x="24" y="${y + 10}" width="312" height="52" rx="9" fill="#fff" stroke="${line}"/><text x="40" y="${y + 42}" class="body">${value}</text>`
}

function photoCard(label, note, y, highlighted = false) {
  const stroke = highlighted ? blue : line
  const fill = highlighted ? '#F4F7FF' : soft
  return `<rect x="24" y="${y}" width="312" height="78" rx="10" fill="${fill}" stroke="${stroke}"/><rect x="36" y="${y + 12}" width="54" height="54" rx="8" fill="#E7E9ED"/><path d="M46 ${y + 51}l13-14 10 10 8-7 9 11" fill="none" stroke="#8B9098" stroke-width="3"/><text x="104" y="${y + 31}" class="body bold">${label}</text><text x="104" y="${y + 53}" class="small muted">${note}</text>`
}

function spinner(cx, cy) {
  return `<circle cx="${cx}" cy="${cy}" r="35" fill="#EAF0FF"/><path d="M${cx - 18} ${cy + 2}a20 20 0 1 1 6 14" fill="none" stroke="${blue}" stroke-width="7" stroke-linecap="round"/><path d="M${cx - 22} ${cy + 7}l4-14 13 8" fill="${blue}"/>`
}

const copy = {
  en: {
    app: 'Business information',
    businessName: 'Business name',
    businessNameValue: 'Toko Sinar Jaya',
    category: 'Business category',
    categoryValue: 'Retail',
    storefront: 'Business place photo',
    storefrontNote: 'Storefront uploaded',
    product: 'Product photo',
    productNote: 'Product photo uploaded',
    continue: 'Continue',
    checkingTitle: 'Checking your business information',
    checkingBody: 'This usually takes less than a few seconds.',
    warningTitle: 'Some information may need review',
    warningBody1: 'The business place photo may not clearly show the storefront.',
    warningBody2: 'You can fix it now or continue if you believe the submission is already correct.',
    fix: 'Fix Data',
    anyway: 'Continue Anyway',
    correctionTitle: 'Review business place photo',
    correctionBody: 'Use a photo that clearly shows the business place and matches the information you entered.',
    replace: 'Replace photo',
    checkAgain: 'Save and check again',
    submittedTitle: 'KYB submitted',
    submittedBody: 'Your submission will continue to the normal verification process.',
    submittedNote: 'The AI pre-check does not approve or reject the merchant.'
  },
  id: {
    app: 'Informasi bisnis',
    businessName: 'Nama bisnis',
    businessNameValue: 'Toko Sinar Jaya',
    category: 'Kategori bisnis',
    categoryValue: 'Retail',
    storefront: 'Foto tempat usaha',
    storefrontNote: 'Foto storefront sudah diunggah',
    product: 'Foto produk',
    productNote: 'Foto produk sudah diunggah',
    continue: 'Lanjut',
    checkingTitle: 'Sedang memeriksa informasi bisnis',
    checkingBody: 'Proses ini biasanya selesai dalam beberapa detik.',
    warningTitle: 'Ada informasi yang mungkin perlu dicek lagi',
    warningBody1: 'Foto tempat usaha mungkin belum menunjukkan storefront dengan cukup jelas.',
    warningBody2: 'Kamu bisa memperbaikinya sekarang atau tetap lanjut jika datanya sudah benar.',
    fix: 'Perbaiki Data',
    anyway: 'Tetap Lanjut',
    correctionTitle: 'Cek foto tempat usaha',
    correctionBody: 'Gunakan foto yang menunjukkan tempat usaha dengan jelas dan sesuai dengan informasi yang kamu isi.',
    replace: 'Ganti foto',
    checkAgain: 'Simpan dan cek lagi',
    submittedTitle: 'KYB sudah dikirim',
    submittedBody: 'Submission akan tetap masuk ke proses verification yang biasa.',
    submittedNote: 'AI pre-check tidak menentukan merchant approve atau reject.'
  }
}

function screens(locale = 'en') {
  const c = copy[locale] || copy.en
  return {
    form: svgUrl(`${appBar(c.app)}${field(c.businessName, c.businessNameValue, 126)}${field(c.category, c.categoryValue, 210)}${photoCard(c.storefront, c.storefrontNote, 304)}${photoCard(c.product, c.productNote, 394)}${primary(c.continue)}`),
    checking: svgUrl(`${appBar(c.app)}${spinner(180, 230)}<text x="180" y="310" text-anchor="middle" class="title">${c.checkingTitle}</text><text x="180" y="342" text-anchor="middle" class="body muted">${c.checkingBody}</text><rect x="60" y="395" width="240" height="8" rx="4" fill="#E8EBF0"/><rect x="60" y="395" width="156" height="8" rx="4" fill="${blue}"/>`),
    warning: svgUrl(`${appBar(c.app)}<circle cx="180" cy="168" r="38" fill="#FFF2D8"/><text x="180" y="180" text-anchor="middle" font-size="32">!</text><text x="24" y="242" class="title">${c.warningTitle}</text><rect x="24" y="270" width="312" height="112" rx="12" fill="${soft}"/><text x="42" y="302" class="body">${c.warningBody1}</text><text x="42" y="328" class="body muted">${c.warningBody2}</text>${secondary(c.fix, 512)}${primary(c.anyway, 566)}`),
    correction: svgUrl(`${appBar(c.correctionTitle)}<text x="24" y="128" class="body muted">${c.correctionBody}</text>${photoCard(c.storefront, c.replace, 176, true)}<rect x="24" y="278" width="312" height="120" rx="12" fill="${soft}"/><text x="44" y="312" class="body bold">${c.storefront}</text><text x="44" y="340" class="small muted">${c.businessNameValue}</text><text x="44" y="362" class="small muted">${c.categoryValue}</text>${primary(c.checkAgain)}`),
    checked: svgUrl(`${appBar(c.app)}${spinner(180, 230)}<text x="180" y="310" text-anchor="middle" class="title">${c.checkingTitle}</text><text x="180" y="342" text-anchor="middle" class="body muted">${c.checkingBody}</text><rect x="60" y="395" width="240" height="8" rx="4" fill="#E8EBF0"/><rect x="60" y="395" width="222" height="8" rx="4" fill="${blue}"/>`),
    submitted: svgUrl(`${appBar('KYB')}<circle cx="180" cy="188" r="48" fill="#E9F7EF"/><path d="M158 189l15 15 31-34" fill="none" stroke="#238B57" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><text x="180" y="284" text-anchor="middle" class="title">${c.submittedTitle}</text><text x="180" y="320" text-anchor="middle" class="body muted">${c.submittedBody}</text><rect x="24" y="378" width="312" height="96" rx="12" fill="${soft}"/><text x="44" y="414" class="body bold">AI-assisted pre-check</text><text x="44" y="442" class="small muted">${c.submittedNote}</text>`)
  }
}

function makeSteps(locale = 'en') {
  const s = screens(locale)
  const isId = locale === 'id'
  return [
    {key:'form',navNumber:'01',counter:'01 / 06',label:isId?'Isi informasi':'Business information',annotation:isId?'Input yang sudah ada':'Use the existing KYB inputs',caption:isId?'Nama bisnis, kategori, foto tempat usaha, dan foto produk sudah tersedia di step ini.':'Business name, category, storefront photo, and product photo are already available in this step.',alt:'KYB business information form',src:s.form,nextKey:'checking',event:'kyb_ai_precheck_form'},
    {key:'checking',navNumber:'02',counter:'02 / 06',label:isId?'AI pre-check':'AI pre-check',annotation:isId?'Cek sebelum submission':'Check before submission',caption:isId?'Model membaca informasi dan foto sebelum merchant masuk ke verification.':'The model reads the submitted information and photos before verification.',alt:'KYB AI pre-check loading state',src:s.checking,nextKey:'warning',event:'kyb_ai_precheck_checking'},
    {key:'warning',navNumber:'03',counter:'03 / 06',label:isId?'Review finding':'Review finding',annotation:isId?'Merchant tetap punya pilihan':'The merchant stays in control',caption:isId?'Finding dari model menjadi warning, bukan hard block.':'A model finding becomes a warning rather than a hard block.',alt:'KYB AI pre-check warning modal',src:s.warning,event:'kyb_ai_precheck_warning',hotspots:[
      {label:isId?'Perbaiki Data':'Fix Data',nextKey:'correction',x:6.7,y:78.3,width:86.6,height:7.2,event:'kyb_ai_precheck_fix'},
      {label:isId?'Tetap Lanjut':'Continue Anyway',nextKey:'submitted',x:6.7,y:86.5,width:86.6,height:7.2,event:'kyb_ai_precheck_continue_anyway'}
    ]},
    {key:'correction',navNumber:'04',counter:'04 / 06',label:isId?'Perbaiki data':'Fix the data',annotation:isId?'Kembali ke input yang relevan':'Return to the relevant input',caption:isId?'Merchant memperbaiki bagian yang ditandai tanpa mengulang seluruh KYB.':'The merchant fixes the flagged input without restarting the whole KYB flow.',alt:'KYB correction screen',src:s.correction,nextKey:'checked',event:'kyb_ai_precheck_correction'},
    {key:'checked',navNumber:'05',counter:'05 / 06',label:isId?'Cek ulang':'Check again',annotation:isId?'Satu pre-check per percobaan':'Controlled model usage',caption:isId?'Versi awal membatasi ketergantungan pada model sambil tetap mengumpulkan evidence produksi.':'The initial release kept model dependency limited while gathering production evidence.',alt:'KYB AI second check state',src:s.checked,nextKey:'submitted',event:'kyb_ai_precheck_recheck'},
    {key:'submitted',navNumber:'06',counter:'06 / 06',label:isId?'Submission':'Submission',annotation:isId?'Verification tetap menentukan hasil':'Verification still owns the decision',caption:isId?'AI membantu sebelum submission, sedangkan keputusan final tetap berada di verification.':'AI assists before submission while the final decision stays with verification.',alt:'KYB submitted screen',src:s.submitted,isEnd:true,event:'kyb_ai_precheck_submitted'}
  ]
}

const presets = {
  'kyb-ai-precheck-flow-en': {analyticsPrefix:'kyb_ai_precheck_revamp',steps:makeSteps('en')},
  'kyb-ai-precheck-flow-id': {analyticsPrefix:'kyb_ai_precheck_revamp',steps:makeSteps('id')}
}

export function getKybAiPrototypePreset(name) {
  return name ? presets[name] || null : null
}
