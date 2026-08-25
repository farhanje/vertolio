import InteractivePrototype from '../../../components/InteractivePrototype'

export const metadata = {
  title: 'Interactive Prototype Lab',
  robots: {index: false, follow: false},
}

function svgData({title, subtitle, progress = 0, cards = [], action = 'Continue', camera = false, success = false}) {
  const cardMarkup = cards.map((card, index) => {
    const y = 350 + (index * 142)
    const status = card.status || 'Not started'
    const statusFill = status === 'Saved' ? '#111111' : '#777777'
    return `
      <rect x="54" y="${y}" width="322" height="112" rx="16" fill="#ffffff" stroke="#d8d8d8"/>
      <circle cx="88" cy="${y + 40}" r="16" fill="${status === 'Saved' ? '#111111' : '#ededed'}"/>
      <text x="118" y="${y + 36}" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" fill="#111111">${card.title}</text>
      <text x="118" y="${y + 62}" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="${statusFill}">${status}</text>
      <text x="348" y="${y + 57}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#777777">›</text>
    `
  }).join('')

  const cameraMarkup = camera ? `
    <rect x="54" y="330" width="322" height="350" rx="26" fill="#171717"/>
    <rect x="76" y="352" width="278" height="306" rx="20" fill="#2b2b2b"/>
    <path d="M112 407h-22v22 M318 407h22v22 M112 603h-22v-22 M318 603h22v-22" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round"/>
    <rect x="126" y="440" width="178" height="112" rx="12" fill="#f1f1f1" stroke="#ffffff" stroke-width="2"/>
    <rect x="147" y="462" width="54" height="62" rx="6" fill="#d5d5d5"/>
    <line x1="218" y1="467" x2="282" y2="467" stroke="#b6b6b6" stroke-width="7"/>
    <line x1="218" y1="492" x2="272" y2="492" stroke="#c4c4c4" stroke-width="7"/>
    <line x1="218" y1="517" x2="287" y2="517" stroke="#c4c4c4" stroke-width="7"/>
    <circle cx="215" cy="715" r="32" fill="#ffffff" stroke="#111111" stroke-width="5"/>
  ` : ''

  const successMarkup = success ? `
    <circle cx="215" cy="430" r="70" fill="#111111"/>
    <path d="M181 431l24 24 47-55" fill="none" stroke="#ffffff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="215" y="535" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#111111">Ready to submit</text>
    <text x="215" y="570" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#666666">Both identity sections are saved.</text>
  ` : ''

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="430" height="932" viewBox="0 0 430 932">
    <rect width="430" height="932" fill="#f7f7f7"/>
    <rect x="0" y="0" width="430" height="104" fill="#ffffff"/>
    <text x="32" y="61" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" fill="#111111">AstraPay</text>
    <text x="398" y="61" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#888888">DEMO</text>
    <rect x="32" y="120" width="366" height="5" rx="2.5" fill="#e3e3e3"/>
    <rect x="32" y="120" width="${Math.max(0, Math.min(progress, 1)) * 366}" height="5" rx="2.5" fill="#111111"/>
    <text x="32" y="191" font-family="Arial, Helvetica, sans-serif" font-size="31" font-weight="700" fill="#111111">${title}</text>
    <text x="32" y="228" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="#666666">${subtitle}</text>
    ${cardMarkup}
    ${cameraMarkup}
    ${successMarkup}
    <rect x="32" y="830" width="366" height="58" rx="12" fill="#111111"/>
    <text x="215" y="866" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#ffffff">${action}</text>
  </svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const demoSteps = [
  {
    label: 'KYC landing',
    caption: 'Set expectations before the user enters the verification flow.',
    alt: 'Demo KYC landing screen',
    src: svgData({
      title: 'Upgrade your account',
      subtitle: 'Complete identity verification to unlock higher limits.',
      progress: .08,
      cards: [
        {title: 'Higher balance limit', status: 'Up to 20M'},
        {title: 'More transactions', status: 'Preferred benefit'},
      ],
      action: 'Start verification',
    }),
  },
  {
    label: 'Review hub',
    caption: 'Flow B makes progress visible and lets users choose the next incomplete section.',
    alt: 'Demo KYC review hub',
    src: svgData({
      title: 'Review your KYC',
      subtitle: 'Complete both sections. Your progress is saved.',
      progress: .22,
      cards: [
        {title: 'Identity card', status: 'Not started'},
        {title: 'Selfie', status: 'Not started'},
      ],
      action: 'Continue',
    }),
  },
  {
    label: 'Capture KTP',
    caption: 'The task is isolated: capture one document, validate it, then return to the hub.',
    alt: 'Demo KTP camera screen',
    src: svgData({
      title: 'Photograph your KTP',
      subtitle: 'Keep the card inside the frame and make sure text is readable.',
      progress: .40,
      camera: true,
      action: 'Use this photo',
    }),
  },
  {
    label: 'Autosaved progress',
    caption: 'Returning to Review proves the first task persisted instead of forcing a serial sequence.',
    alt: 'Demo KYC review hub with KTP saved',
    src: svgData({
      title: 'Review your KYC',
      subtitle: 'One section saved. Finish the remaining step when ready.',
      progress: .58,
      cards: [
        {title: 'Identity card', status: 'Saved'},
        {title: 'Selfie', status: 'Not started'},
      ],
      action: 'Continue',
    }),
  },
  {
    label: 'Capture selfie',
    caption: 'A second independent task can be completed without losing the KTP state.',
    alt: 'Demo selfie camera screen',
    src: svgData({
      title: 'Take a selfie',
      subtitle: 'Position your face clearly and look straight at the camera.',
      progress: .78,
      camera: true,
      action: 'Use this selfie',
    }),
  },
  {
    label: 'Ready to submit',
    caption: 'Both sections resolve into one final review state before submission.',
    alt: 'Demo KYC ready to submit screen',
    src: svgData({
      title: 'Verification complete',
      subtitle: 'Check your saved information before sending it for review.',
      progress: 1,
      success: true,
      action: 'Submit KYC',
    }),
  },
]

export default function InteractivePrototypeLab() {
  return (
    <main className="container" style={{padding: '54px 0 90px'}}>
      <div style={{maxWidth: 760, marginBottom: 28}}>
        <div className="kicker"><span className="dot" /> Portfolio lab / not production</div>
        <h1 style={{fontSize: 'clamp(42px, 6vw, 78px)'}}>Make the work inspectable.</h1>
        <p className="lead">
          Interaction proof-of-concept for the KYC Autosave case study. The screen content below is intentionally fake; the component is the part being tested.
        </p>
      </div>

      <InteractivePrototype
        eyebrow="Interactive product artifact"
        title="Try the flexible KYC flow"
        description="Instead of showing a static strip of screens, let a reviewer move through the behavior that made Flow B different: a Review hub, independently saved tasks, and a final submission state. Click the device, choose a step, or use the arrow keys."
        theme="dark"
        device="phone"
        steps={demoSteps}
      />
    </main>
  )
}
