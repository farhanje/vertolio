import InteractivePrototype from '../../../components/InteractivePrototype'

export const metadata = {
  title: 'Interactive Prototype Lab',
  robots: {index: false, follow: false},
}

const blue = '#1557E8'
const muted = '#666666'
const line = '#E4E4E4'

function svgUrl(body, height = 779) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="${height}" viewBox="0 0 360 ${height}">
    <rect width="360" height="${height}" fill="#fff"/>
    <style>
      text{font-family:Arial,Helvetica,sans-serif;fill:#222}
      .small{font-size:11px}.body{font-size:13px}.label{font-size:14px}.title{font-size:19px;font-weight:700}.bold{font-weight:700}.muted{fill:${muted}}
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

function infoFooter(y = 625) {
  return `<text x="38" y="${y}" class="body muted">♡</text><text x="60" y="${y}" class="body muted">AstraPay memastikan datamu terjaga aman.</text><text x="60" y="${y + 21}" class="body muted">Proses ini diawasi oleh  ◉ BANK INDONESIA</text>`
}

function button(label, y = 715, enabled = true) {
  const fill = enabled ? blue : '#CAD7F7'
  return `<rect x="24" y="${y}" width="312" height="41" rx="8" fill="${fill}"/><text x="180" y="${y + 26}" text-anchor="middle" font-size="14" font-weight="700" fill="#fff" style="fill:#fff">${label}</text>`
}

function taskCard({y, title, status = 'empty', buttonLabel = 'Ambil Foto'}) {
  const saved = status === 'saved'
  const leftFill = saved ? '#06B893' : '#E8E8E8'
  const leftContent = saved
    ? `<path d="M58 ${y + 54} l16 16 30 -34" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<rect x="58" y="${y + 38}" width="38" height="31" rx="4" fill="#D3D3D3"/><circle cx="69" cy="48" r="5" fill="#eee" transform="translate(0 ${y})"/>`
  const action = saved
    ? `<rect x="230" y="${y + 57}" width="92" height="31" rx="9" fill="#D7E2FB"/><text x="276" y="${y + 77}" text-anchor="middle" class="small bold" fill="#fff" style="fill:#fff">Sudah Diambil</text>`
    : `<rect x="248" y="${y + 65}" width="73" height="31" rx="8" fill="${blue}"/><text x="284.5" y="${y + 85}" text-anchor="middle" class="small" fill="#fff" style="fill:#fff">${buttonLabel}</text>`
  return `<rect x="24" y="${y}" width="312" height="111" rx="12" fill="#fff" stroke="${line}"/>
    <rect x="40" y="${y + 16}" width="80" height="80" rx="12" fill="${leftFill}"/>${leftContent}
    <text x="140" y="${y + 32}" class="label">${title}</text>
    <text x="140" y="${y + 53}" class="small" fill="${blue}" style="fill:${blue}">ⓘ Lihat Cara Foto</text>${action}`
}

const screens = {
  intro: svgUrl(`${appBar('Upgrade Akun')}
    <text x="24" y="132" class="title">Upgrade Akunmu dan Dapatkan</text><text x="24" y="155" class="title">Bonus Poin 2x Lipat!</text>
    <text x="24" y="191" class="body muted">Mudah dan banyak untungnya!</text>
    <rect x="24" y="217" width="312" height="104" rx="14" fill="#F4F7FF"/><text x="44" y="250" class="body bold">Limit saldo hingga 20jt</text><text x="44" y="278" class="body">Transfer &amp; Tarik Tunai</text><text x="44" y="304" class="body">Promo berkali lipat</text>
    <text x="24" y="365" class="title">Cara Upgrade ke Preferred</text>
    <circle cx="39" cy="409" r="15" fill="${blue}"/><text x="39" y="414" text-anchor="middle" class="body bold" fill="#fff" style="fill:#fff">1</text><text x="67" y="405" class="body bold">Upload Foto e-KTP atau SIM</text><text x="67" y="426" class="small muted">Kalau identitas rusak, bisa tambah bukti paspor.</text>
    <circle cx="39" cy="475" r="15" fill="${blue}"/><text x="39" y="480" text-anchor="middle" class="body bold" fill="#fff" style="fill:#fff">2</text><text x="67" y="471" class="body bold">Ambil Foto Selfie</text><text x="67" y="492" class="small muted">Pastikan wajah terlihat jelas dan cukup cahaya.</text>
    ${infoFooter(675)}${button('Mulai Upgrade', 774)}`, 845),

  hubEmpty: svgUrl(`${appBar('Upgrade Akun')}${taskCard({y:115,title:'Foto e-KTP atau SIM'})}${taskCard({y:250,title:'Foto Selfie'})}${infoFooter(625)}${button('Lanjutkan',715,false)}`),

  ktpCapture: svgUrl(`${appBar('Ambil Foto e-KTP atau SIM')}
    <rect x="24" y="132" width="312" height="390" rx="18" fill="#202020"/>
    <path d="M58 174h28M58 174v28M302 174h-28M302 174v28M58 480h28M58 480v-28M302 480h-28M302 480v-28" stroke="#fff" stroke-width="3" fill="none"/>
    <rect x="64" y="245" width="232" height="146" rx="12" fill="#D7DCE5"/><rect x="82" y="263" width="62" height="88" rx="7" fill="#B7C0CC"/><line x1="162" y1="272" x2="270" y2="272" stroke="#9EA8B5" stroke-width="7"/><line x1="162" y1="299" x2="257" y2="299" stroke="#AAB3BE" stroke-width="7"/><line x1="162" y1="326" x2="275" y2="326" stroke="#AAB3BE" stroke-width="7"/>
    <text x="180" y="560" text-anchor="middle" class="body bold">Ketuk pada layar untuk memfokuskan</text><text x="180" y="584" text-anchor="middle" class="small muted">Tempatkan identitas di dalam area frame</text>
    <circle cx="180" cy="684" r="33" fill="#fff" stroke="#222" stroke-width="5"/><text x="180" y="748" text-anchor="middle" class="small muted">Bisa Ambil Foto e-KTP atau SIM*</text>`),

  hubKtp: svgUrl(`${appBar('Tinjauan')}${taskCard({y:115,title:'Foto e-KTP',status:'saved'})}${taskCard({y:250,title:'Foto Selfie'})}${infoFooter(625)}${button('Lanjutkan',715,false)}`),

  selfieCapture: svgUrl(`${appBar('Foto Selfie')}
    <rect x="0" y="90" width="360" height="710" fill="#101010"/>
    <ellipse cx="180" cy="348" rx="108" ry="143" fill="#262626" stroke="#fff" stroke-width="3"/>
    <circle cx="180" cy="312" r="48" fill="#B9B9B9"/><path d="M112 476c10-79 126-79 136 0" fill="#B9B9B9"/>
    <text x="180" y="566" text-anchor="middle" font-size="17" font-weight="700" fill="#fff" style="fill:#fff">Pegang smartphone</text><text x="180" y="590" text-anchor="middle" font-size="17" font-weight="700" fill="#fff" style="fill:#fff">setinggi mata</text>
    <rect x="76" y="633" width="208" height="42" rx="21" fill="#fff" opacity=".12"/><text x="180" y="659" text-anchor="middle" class="body" fill="#fff" style="fill:#fff">Ikuti arahan di layar</text>`, 800),

  hubSelfie: svgUrl(`${appBar('Tinjauan')}${taskCard({y:115,title:'Foto e-KTP'})}${taskCard({y:250,title:'Foto Selfie',status:'saved'})}${infoFooter(625)}${button('Lanjutkan',715,false)}`),

  hubComplete: svgUrl(`${appBar('Tinjauan')}${taskCard({y:115,title:'Foto e-KTP',status:'saved'})}${taskCard({y:250,title:'Foto Selfie',status:'saved'})}${infoFooter(625)}${button('Lanjutkan',715,true)}`),

  processing: svgUrl(`${appBar('Upgrade Akun')}
    <circle cx="180" cy="184" r="56" fill="#EAF0FF"/><path d="M152 184l19 19 38-44" stroke="${blue}" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="180" y="284" text-anchor="middle" class="title">Upgrade Akun Sedang Diproses</text><text x="180" y="314" text-anchor="middle" class="body muted">Verifikasi membutuhkan waktu 1x24 jam.</text><text x="180" y="335" text-anchor="middle" class="body muted">Kamu akan mendapat notifikasi setelah selesai.</text>
    <text x="24" y="404" class="title">Yeay, Kamu Akan Mendapatkan</text><text x="24" y="428" class="title">Semua Keuntungan Ini!</text>
    <rect x="24" y="458" width="312" height="86" rx="12" fill="#F7F8FA"/><text x="44" y="489" class="body bold">Limit Saldo Sampai 20 Juta</text><text x="44" y="512" class="small muted">Transaksi lebih leluasa dengan limit lebih besar.</text>
    <rect x="24" y="558" width="312" height="86" rx="12" fill="#F7F8FA"/><text x="44" y="589" class="body bold">Bisa Transfer Bank dan Tarik Tunai</text><text x="44" y="612" class="small muted">Kirim dan tarik saldo kapan saja.</text>
    <rect x="24" y="658" width="312" height="86" rx="12" fill="#F7F8FA"/><text x="44" y="689" class="body bold">Dapatkan Promo Eksklusif</text><text x="44" y="712" class="small muted">Promo khusus Preferred member.</text>${button('Kembali Ke Beranda',899,true)}`, 988),
}

const taskHotspots = {
  ktp: {label: 'Start KTP', x: 6.5, y: 14.2, width: 87, height: 14.8},
  selfie: {label: 'Start Selfie', x: 6.5, y: 31, width: 87, height: 14.8},
}

const demoSteps = [
  {key:'intro',navNumber:'01',counter:'01 / 07',label:'Upgrade entry',annotation:'Set expectations',caption:'The upgrade page explains the two verification tasks before the user enters KYC.',alt:'AstraPay Upgrade Akun screen',src:screens.intro,nextKey:'hub-empty',event:'kyc_lab_start'},
  {key:'hub-empty',navNumber:'02',counter:'02 / 07',label:'Tinjauan hub',annotation:'01 · Task hub replaces forced sequence',caption:'Choose either KTP or Selfie. The flow no longer dictates one fixed order.',alt:'AstraPay KYC review hub with both tasks incomplete',src:screens.hubEmpty,hotspots:[{...taskHotspots.ktp,nextKey:'ktp-first',event:'kyc_lab_ktp'},{...taskHotspots.selfie,nextKey:'selfie-first',event:'kyc_lab_selfie'}]},
  {key:'ktp-first',navNumber:'03',counter:'03 / 07',navGroup:'ktp',label:'Capture KTP',annotation:'Complete one task',caption:'The identity document task is completed independently from Selfie.',alt:'AstraPay KTP capture screen',src:screens.ktpCapture,nextKey:'hub-ktp',event:'kyc_lab_ktp'},
  {key:'hub-ktp',navNumber:'04',counter:'04 / 07',navGroup:'autosave',label:'Autosaved progress',annotation:'02 · Completed work persists',caption:'The user returns to Tinjauan with KTP retained and Selfie still independently actionable.',alt:'AstraPay Tinjauan screen with KTP saved and Selfie incomplete',src:screens.hubKtp,hotspots:[{...taskHotspots.selfie,nextKey:'selfie-after-ktp',event:'kyc_lab_selfie'}],event:'kyc_lab_autosave_return'},
  {key:'selfie-after-ktp',navNumber:'05',counter:'05 / 07',navGroup:'selfie',label:'Selfie / liveness',annotation:'03 · Resume from remaining task',caption:'Only the remaining task needs attention. Previously completed KTP work stays intact.',alt:'AstraPay selfie liveness screen',src:screens.selfieCapture,nextKey:'hub-complete',event:'kyc_lab_selfie'},
  {key:'selfie-first',counter:'03 / 07',navGroup:'selfie',showInNav:false,label:'Selfie / liveness',annotation:'Complete one task',caption:'The same system also supports Selfie first, proving that task order is genuinely flexible.',alt:'AstraPay selfie liveness screen',src:screens.selfieCapture,nextKey:'hub-selfie',event:'kyc_lab_selfie'},
  {key:'hub-selfie',counter:'04 / 07',navGroup:'autosave',showInNav:false,label:'Selfie autosaved',annotation:'02 · Completed work persists',caption:'Selfie is retained while KTP remains available. Autosave works regardless of task order.',alt:'AstraPay Tinjauan screen with Selfie saved and KTP incomplete',src:screens.hubSelfie,hotspots:[{...taskHotspots.ktp,nextKey:'ktp-after-selfie',event:'kyc_lab_ktp'}],event:'kyc_lab_autosave_return'},
  {key:'ktp-after-selfie',counter:'05 / 07',navGroup:'ktp',showInNav:false,label:'Capture KTP',annotation:'03 · Resume from remaining task',caption:'The user can finish KTP after Selfie without repeating the completed task.',alt:'AstraPay KTP capture screen',src:screens.ktpCapture,nextKey:'hub-complete',event:'kyc_lab_ktp'},
  {key:'hub-complete',navNumber:'06',counter:'06 / 07',navGroup:'complete',label:'Ready to submit',annotation:'04 · Tasks converge before submission',caption:'Both independently completed tasks resolve into one final Tinjauan state.',alt:'AstraPay Tinjauan screen with KTP and Selfie completed',src:screens.hubComplete,nextKey:'processing',event:'kyc_lab_complete'},
  {key:'processing',navNumber:'07',counter:'07 / 07',navGroup:'processing',label:'Verification sent',annotation:'Submission state',caption:'The flexible task model ends in the same operational review state after submission.',alt:'AstraPay Upgrade Akun processing screen',src:screens.processing,isEnd:true,event:'kyc_lab_submit'},
]

const comparisonStyle = {display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))',gap:1,background:'#d8d8d2',border:'1px solid #d8d8d2',marginTop:22}
const comparisonCardStyle = {background:'#f7f7f2',padding:'22px'}

export default function InteractivePrototypeLab() {
  return (
    <main className="container" style={{padding:'54px 0 90px'}}>
      <div style={{maxWidth:790,marginBottom:28}}>
        <div className="kicker"><span className="dot" /> Portfolio lab / not production</div>
        <h1 style={{fontSize:'clamp(42px, 6vw, 78px)'}}>Make the system inspectable.</h1>
        <p className="lead">Flow B reconstructed from the exact KYC Figma states. At Tinjauan, choose KTP or Selfie and watch the completed task persist when the flow returns to the hub.</p>
      </div>

      <InteractivePrototype eyebrow="Interactive product artifact · Flow B" title="Try the flexible KYC flow" description="The design change was not simply a different sequence of screens. Autosave made KTP and Selfie independently completable tasks, coordinated through Tinjauan. Choose either task first to inspect the behavior." theme="dark" device="phone" steps={demoSteps} />

      <section style={{marginTop:52,maxWidth:1000}}>
        <div className="kicker"><span className="dot" /> Why the structure changed</div>
        <h2 style={{fontSize:'clamp(30px, 4vw, 52px)',maxWidth:760,marginBottom:12}}>From a forced sequence to resumable tasks.</h2>
        <p style={{maxWidth:720,color:'#595959'}}>Flow B decoupled KYC tasks so progress could persist independently. Tinjauan became the orchestration layer: it shows what is done, what remains, and where the user can resume.</p>
        <div style={comparisonStyle}>
          <article style={comparisonCardStyle}><div className="kicker">Flow A · serial</div><p style={{fontSize:18,lineHeight:1.5,margin:'14px 0 0'}}>Guide → KTP → Selfie → Form</p><p style={{fontSize:13,lineHeight:1.55,color:'#666',marginBottom:0}}>Progress is experienced as one prescribed sequence. Leaving a step interrupts the journey.</p></article>
          <article style={comparisonCardStyle}><div className="kicker">Flow B · flexible</div><p style={{fontSize:18,lineHeight:1.5,margin:'14px 0 0'}}>Tinjauan → choose task → autosave → return → remaining task</p><p style={{fontSize:13,lineHeight:1.55,color:'#666',marginBottom:0}}>Each task can resolve independently while the hub preserves state and coordinates what happens next.</p></article>
        </div>
      </section>

      <p style={{marginTop:28,maxWidth:720,fontSize:12,color:'#777'}}>Lab note: these self-contained vector screens mirror the exact states and copy from the Figma Flow B prototype, so this preview no longer depends on temporary Figma asset URLs.</p>
    </main>
  )
}
