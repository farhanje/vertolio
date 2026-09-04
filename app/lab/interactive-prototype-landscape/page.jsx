import InteractivePrototype from '../../../components/InteractivePrototype'

export const metadata = {
  title: 'Landscape Interactive Prototype Lab',
  robots: {index: false, follow: false},
}

function svgUrl(body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
    <rect width="1200" height="900" fill="#f7f7f5"/>
    <style>
      text{font-family:Arial,Helvetica,sans-serif;fill:#151515}
      .eyebrow{font-size:18px;font-weight:700;letter-spacing:2px;fill:#6a6a6a}
      .title{font-size:42px;font-weight:700}
      .body{font-size:22px;fill:#5d5d5d}
      .label{font-size:18px;font-weight:700}
      .small{font-size:16px;fill:#747474}
    </style>
    ${body}
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const overview = svgUrl(`
  <rect x="0" y="0" width="1200" height="92" fill="#fff"/>
  <text x="54" y="56" class="label">Operations Workspace</text>
  <text x="54" y="150" class="eyebrow">LANDSCAPE QA</text>
  <text x="54" y="210" class="title">Review queue</text>
  <text x="54" y="252" class="body">A 4:3 surface for tablet, kiosk, or internal-tool interactions.</text>
  <rect x="54" y="320" width="1092" height="104" rx="18" fill="#fff" stroke="#deded8"/>
  <text x="84" y="362" class="label">Merchant application 0248</text>
  <text x="84" y="395" class="small">Waiting for document review</text>
  <rect x="928" y="342" width="176" height="58" rx="12" fill="#111"/>
  <text x="1016" y="378" text-anchor="middle" font-size="18" font-weight="700" fill="#fff" style="fill:#fff">Open review</text>
  <rect x="54" y="452" width="1092" height="104" rx="18" fill="#fff" stroke="#deded8"/>
  <text x="84" y="494" class="label">Merchant application 0247</text>
  <text x="84" y="527" class="small">Approved 12 minutes ago</text>
  <rect x="54" y="584" width="526" height="222" rx="22" fill="#ecece7"/>
  <rect x="608" y="584" width="538" height="222" rx="22" fill="#202020"/>
  <text x="84" y="636" class="eyebrow">QUEUE</text>
  <text x="84" y="704" font-size="72" font-weight="700">18</text>
  <text x="84" y="748" class="body">items need review</text>
  <text x="642" y="636" class="eyebrow" fill="#aaa" style="fill:#aaa">TODAY</text>
  <text x="642" y="704" font-size="72" font-weight="700" fill="#fff" style="fill:#fff">42</text>
  <text x="642" y="748" font-size="22" fill="#c9c9c9" style="fill:#c9c9c9">applications resolved</text>
`)

const detail = svgUrl(`
  <rect x="0" y="0" width="1200" height="92" fill="#fff"/>
  <text x="54" y="56" class="label">Operations Workspace</text>
  <text x="54" y="150" class="eyebrow">APPLICATION 0248</text>
  <text x="54" y="210" class="title">Business review</text>
  <rect x="54" y="278" width="510" height="470" rx="22" fill="#fff" stroke="#deded8"/>
  <text x="88" y="326" class="label">Submitted information</text>
  <text x="88" y="382" class="small">Business name</text>
  <text x="88" y="416" font-size="24" font-weight="700">Kedai Nusantara</text>
  <text x="88" y="476" class="small">Category</text>
  <text x="88" y="510" font-size="24" font-weight="700">Food &amp; Beverage</text>
  <text x="88" y="570" class="small">Settlement account</text>
  <text x="88" y="604" font-size="24" font-weight="700">Verified</text>
  <rect x="602" y="278" width="544" height="276" rx="22" fill="#e9e9e4"/>
  <text x="636" y="326" class="label">Business photo</text>
  <rect x="636" y="356" width="476" height="164" rx="16" fill="#d0d0ca"/>
  <text x="874" y="448" text-anchor="middle" class="body">Image preview</text>
  <rect x="602" y="586" width="260" height="74" rx="14" fill="#fff" stroke="#cfcfc8"/>
  <text x="732" y="632" text-anchor="middle" class="label">Request revision</text>
  <rect x="886" y="586" width="260" height="74" rx="14" fill="#111"/>
  <text x="1016" y="632" text-anchor="middle" class="label" fill="#fff" style="fill:#fff">Approve</text>
  <text x="602" y="718" class="small">Choose a decision to complete this QA interaction.</text>
`)

const complete = svgUrl(`
  <rect x="0" y="0" width="1200" height="900" fill="#f4f4f0"/>
  <circle cx="600" cy="330" r="88" fill="#111"/>
  <path d="M554 330l31 31 66-76" stroke="#fff" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="600" y="474" text-anchor="middle" class="title">Decision saved</text>
  <text x="600" y="524" text-anchor="middle" class="body">Application 0248 can now move to the next operational state.</text>
  <rect x="460" y="598" width="280" height="72" rx="14" fill="#111"/>
  <text x="600" y="643" text-anchor="middle" class="label" fill="#fff" style="fill:#fff">Back to queue</text>
`)

const steps = [
  {
    key: 'overview',
    navNumber: '01',
    counter: '01 / 03',
    label: 'Review queue',
    annotation: 'Landscape overview',
    caption: 'The frame keeps a 4:3 surface without stretching the uploaded screen.',
    alt: 'Landscape operations review queue',
    src: overview,
    hotspots: [
      {label: 'Open review', nextKey: 'detail', x: 76, y: 36, width: 19, height: 9},
    ],
  },
  {
    key: 'detail',
    navNumber: '02',
    counter: '02 / 03',
    label: 'Review detail',
    annotation: 'Touch or pointer flow',
    caption: 'The landscape frame supports the same hotspot and branching behavior as phone and browser prototypes.',
    alt: 'Landscape application review detail',
    src: detail,
    hotspots: [
      {label: 'Approve', nextKey: 'complete', x: 73.5, y: 64, width: 22.5, height: 10},
    ],
  },
  {
    key: 'complete',
    navNumber: '03',
    counter: '03 / 03',
    label: 'Decision saved',
    annotation: 'End state',
    caption: 'The final state stays inside the same 4:3 device surface.',
    alt: 'Landscape review completion screen',
    src: complete,
    isEnd: true,
  },
]

export default function LandscapeInteractivePrototypeLab() {
  return (
    <main className="container" style={{paddingTop: 48, paddingBottom: 80}}>
      <section className="section tight">
        <div className="kicker"><span className="dot" /> Portfolio system / prototype QA</div>
        <h1 className="h1-tight">Landscape interactive mockup</h1>
        <p className="lead">Dedicated 4:3 device mode for tablet, kiosk, dashboard, and other landscape product surfaces.</p>
      </section>

      <InteractivePrototype
        eyebrow="Landscape prototype"
        title="A true 4:3 interactive device frame"
        description="This QA flow verifies the landscape frame, hotspots, navigation, and responsive behavior without borrowing browser chrome."
        theme="dark"
        device="landscape"
        analyticsPrefix="landscape_prototype_lab"
        steps={steps}
      />
    </main>
  )
}
