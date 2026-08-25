import InteractivePrototype from '../../../components/InteractivePrototype'

export const metadata = {
  title: 'Interactive Prototype Lab',
  robots: {index: false, follow: false},
}

const screens = {
  intro: 'https://www.figma.com/api/mcp/asset/8fcb0a19-5946-4ec4-bcdf-433620ce4127.png',
  hubEmpty: 'https://www.figma.com/api/mcp/asset/3bee80d7-ecfd-4851-bd5c-ee52030e9f23.png',
  ktpCapture: 'https://www.figma.com/api/mcp/asset/aff9d8f7-ce04-49e9-9756-e1e2b3d5269b.png',
  hubKtp: 'https://www.figma.com/api/mcp/asset/11f70f8d-7f87-4801-b6bb-1bc6f478d293.png',
  selfieCapture: 'https://www.figma.com/api/mcp/asset/0879c022-f726-4fbf-96d9-7b8a5ae12d99.png',
  hubSelfie: 'https://www.figma.com/api/mcp/asset/b344c060-0ffb-4ff8-9d62-d379ede0cf8b.png',
  hubComplete: 'https://www.figma.com/api/mcp/asset/690a61f0-9eb6-4103-b18d-735a07853ebf.png',
  processing: 'https://www.figma.com/api/mcp/asset/3f6952ea-66ea-464e-8d9e-47482aab8bdc.png',
}

const taskHotspots = {
  ktp: {label: 'Start KTP', x: 6.5, y: 14.2, width: 87, height: 14.8},
  selfie: {label: 'Start Selfie', x: 6.5, y: 31, width: 87, height: 14.8},
}

const demoSteps = [
  {
    key: 'intro',
    navNumber: '01',
    counter: '01 / 07',
    label: 'Upgrade entry',
    annotation: 'Set expectations',
    caption: 'The existing upgrade page explains the two verification tasks before the user enters KYC.',
    alt: 'AstraPay Upgrade Akun screen',
    src: screens.intro,
    nextKey: 'hub-empty',
    event: 'kyc_lab_start',
  },
  {
    key: 'hub-empty',
    navNumber: '02',
    counter: '02 / 07',
    label: 'Tinjauan hub',
    annotation: '01 · Task hub replaces forced sequence',
    caption: 'Choose either KTP or Selfie. The flow no longer dictates one fixed order.',
    alt: 'AstraPay KYC review hub with both tasks incomplete',
    src: screens.hubEmpty,
    hotspots: [
      {...taskHotspots.ktp, nextKey: 'ktp-first', event: 'kyc_lab_ktp'},
      {...taskHotspots.selfie, nextKey: 'selfie-first', event: 'kyc_lab_selfie'},
    ],
  },
  {
    key: 'ktp-first',
    navNumber: '03',
    counter: '03 / 07',
    navGroup: 'ktp',
    label: 'Capture KTP',
    annotation: 'Complete one task',
    caption: 'The identity document task is completed independently from Selfie.',
    alt: 'AstraPay KTP capture screen',
    src: screens.ktpCapture,
    nextKey: 'hub-ktp',
    event: 'kyc_lab_ktp',
  },
  {
    key: 'hub-ktp',
    navNumber: '04',
    counter: '04 / 07',
    navGroup: 'autosave',
    label: 'Autosaved progress',
    annotation: '02 · Completed work persists',
    caption: 'The user returns to Tinjauan with KTP retained and Selfie still independently actionable.',
    alt: 'AstraPay Tinjauan screen with KTP saved and Selfie incomplete',
    src: screens.hubKtp,
    hotspots: [
      {...taskHotspots.selfie, nextKey: 'selfie-after-ktp', event: 'kyc_lab_selfie'},
    ],
    event: 'kyc_lab_autosave_return',
  },
  {
    key: 'selfie-after-ktp',
    navNumber: '05',
    counter: '05 / 07',
    navGroup: 'selfie',
    label: 'Selfie / liveness',
    annotation: '03 · Resume from remaining task',
    caption: 'Only the remaining task needs attention. Previously completed KTP work stays intact.',
    alt: 'AstraPay selfie liveness screen',
    src: screens.selfieCapture,
    nextKey: 'hub-complete',
    event: 'kyc_lab_selfie',
  },
  {
    key: 'selfie-first',
    counter: '03 / 07',
    navGroup: 'selfie',
    showInNav: false,
    label: 'Selfie / liveness',
    annotation: 'Complete one task',
    caption: 'The same system also supports Selfie first, proving that task order is genuinely flexible.',
    alt: 'AstraPay selfie liveness screen',
    src: screens.selfieCapture,
    nextKey: 'hub-selfie',
    event: 'kyc_lab_selfie',
  },
  {
    key: 'hub-selfie',
    counter: '04 / 07',
    navGroup: 'autosave',
    showInNav: false,
    label: 'Selfie autosaved',
    annotation: '02 · Completed work persists',
    caption: 'Selfie is retained while KTP remains available. Autosave works regardless of task order.',
    alt: 'AstraPay Tinjauan screen with Selfie saved and KTP incomplete',
    src: screens.hubSelfie,
    hotspots: [
      {...taskHotspots.ktp, nextKey: 'ktp-after-selfie', event: 'kyc_lab_ktp'},
    ],
    event: 'kyc_lab_autosave_return',
  },
  {
    key: 'ktp-after-selfie',
    counter: '05 / 07',
    navGroup: 'ktp',
    showInNav: false,
    label: 'Capture KTP',
    annotation: '03 · Resume from remaining task',
    caption: 'The user can finish KTP after Selfie without repeating the completed task.',
    alt: 'AstraPay KTP capture screen',
    src: screens.ktpCapture,
    nextKey: 'hub-complete',
    event: 'kyc_lab_ktp',
  },
  {
    key: 'hub-complete',
    navNumber: '06',
    counter: '06 / 07',
    navGroup: 'complete',
    label: 'Ready to submit',
    annotation: '04 · Tasks converge before submission',
    caption: 'Both independently completed tasks resolve into one final Tinjauan state.',
    alt: 'AstraPay Tinjauan screen with KTP and Selfie completed',
    src: screens.hubComplete,
    nextKey: 'processing',
    event: 'kyc_lab_complete',
  },
  {
    key: 'processing',
    navNumber: '07',
    counter: '07 / 07',
    navGroup: 'processing',
    label: 'Verification sent',
    annotation: 'Submission state',
    caption: 'The flexible task model ends in the same operational review state after submission.',
    alt: 'AstraPay Upgrade Akun processing screen',
    src: screens.processing,
    isEnd: true,
    event: 'kyc_lab_submit',
  },
]

const comparisonStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 1,
  background: '#d8d8d2',
  border: '1px solid #d8d8d2',
  marginTop: 22,
}

const comparisonCardStyle = {
  background: '#f7f7f2',
  padding: '22px',
}

export default function InteractivePrototypeLab() {
  return (
    <main className="container" style={{padding: '54px 0 90px'}}>
      <div style={{maxWidth: 790, marginBottom: 28}}>
        <div className="kicker"><span className="dot" /> Portfolio lab / not production</div>
        <h1 style={{fontSize: 'clamp(42px, 6vw, 78px)'}}>Make the system inspectable.</h1>
        <p className="lead">
          Real AstraPay Flow B screens from the KYC prototype. At Tinjauan, choose KTP or Selfie and watch the completed task persist when the flow returns to the hub.
        </p>
      </div>

      <InteractivePrototype
        eyebrow="Interactive product artifact · Flow B"
        title="Try the flexible KYC flow"
        description="The design change was not simply a different sequence of screens. Autosave made KTP and Selfie independently completable tasks, coordinated through Tinjauan. Choose either task first to inspect the behavior."
        theme="dark"
        device="phone"
        steps={demoSteps}
      />

      <section style={{marginTop: 52, maxWidth: 1000}}>
        <div className="kicker"><span className="dot" /> Why the structure changed</div>
        <h2 style={{fontSize: 'clamp(30px, 4vw, 52px)', maxWidth: 760, marginBottom: 12}}>From a forced sequence to resumable tasks.</h2>
        <p style={{maxWidth: 720, color: '#595959'}}>
          Flow B decoupled KYC tasks so progress could persist independently. Tinjauan became the orchestration layer: it shows what is done, what remains, and where the user can resume.
        </p>

        <div style={comparisonStyle}>
          <article style={comparisonCardStyle}>
            <div className="kicker">Flow A · serial</div>
            <p style={{fontSize: 18, lineHeight: 1.5, margin: '14px 0 0'}}>
              Guide → KTP → Selfie → Form
            </p>
            <p style={{fontSize: 13, lineHeight: 1.55, color: '#666', marginBottom: 0}}>
              Progress is experienced as one prescribed sequence. Leaving a step interrupts the journey.
            </p>
          </article>

          <article style={comparisonCardStyle}>
            <div className="kicker">Flow B · flexible</div>
            <p style={{fontSize: 18, lineHeight: 1.5, margin: '14px 0 0'}}>
              Tinjauan → choose task → autosave → return → remaining task
            </p>
            <p style={{fontSize: 13, lineHeight: 1.55, color: '#666', marginBottom: 0}}>
              Each task can resolve independently while the hub preserves state and coordinates what happens next.
            </p>
          </article>
        </div>
      </section>

      <p style={{marginTop: 28, maxWidth: 720, fontSize: 12, color: '#777'}}>
        Lab note: these renders are linked directly from Figma for rapid interaction testing. They will be moved to permanent portfolio assets before this component is used in production.
      </p>
    </main>
  )
}
