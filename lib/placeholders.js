export const placeholderOrganizations = [
  { name: 'AstraPay', slug: { current: 'astrapay' }, order: 1 },
  { name: 'TU/e', slug: { current: 'tue' }, order: 2 },
  { name: 'Telkom Indonesia', slug: { current: 'telkom-indonesia' }, order: 3 },
  { name: 'Others', slug: { current: 'others' }, order: 4 },
]

export const placeholderProjects = [
  {
    title: 'A/B Testing: Serial vs Parallel KYC Flow',
    slug: { current: 'kyc-serial-vs-parallel-ab' },
    summary: 'Quant experiment comparing upload order patterns to improve completion and reduce drop-offs.',
    tags: ['Experiment', 'Quant', 'KYC'],
    organization: { name: 'AstraPay', slug: { current: 'astrapay' } },
    role: 'Designer / Researcher',
    timeline: '2025',
    body: [
      { _type: 'block', children: [{ _type: 'span', text: 'Placeholder case study. We will replace this with your real narrative and metrics from your deck/docs.' }] },
    ],
  },
  {
    title: 'Production A/B Test: Homepage Upgrade Copy',
    slug: { current: 'homepage-upgrade-copy-ab' },
    summary: 'Production experiment measuring impact of wording changes on KYC start and submit.',
    tags: ['Experiment', 'Production', 'Copy'],
    organization: { name: 'AstraPay', slug: { current: 'astrapay' } },
    role: 'Designer / Researcher',
    timeline: '2025',
    body: [
      { _type: 'block', children: [{ _type: 'span', text: 'Placeholder case study. We will replace this with the A/B/C variants and results once you paste the final text.' }] },
    ],
  },
  {
    title: 'OCR Evaluation: SIM & KTP (Vertex vs AdvanceAI)',
    slug: { current: 'ocr-sim-ktp-vertex' },
    summary: 'Reduced cost per hit while lowering user correction effort and improving coverage.',
    tags: ['AI', 'OCR', 'Cost'],
    organization: { name: 'AstraPay', slug: { current: 'astrapay' } },
    role: 'Designer / Researcher',
    timeline: '2025',
    body: [
      { _type: 'block', children: [{ _type: 'span', text: 'Placeholder case study. We will add your metrics (e.g., cost per hit and edit rate) and a redacted screenshot.' }] },
    ],
  },
  {
    title: 'Product Discovery: AstraPay Tabungan',
    slug: { current: 'astrapay-tabungan-discovery' },
    summary: 'Qual discovery resolving a product fork: separated saving pocket vs merged wallet balance.',
    tags: ['Discovery', 'Qual', 'Strategy'],
    organization: { name: 'AstraPay', slug: { current: 'astrapay' } },
    role: 'Designer / Researcher',
    timeline: '2025–2026',
    body: [
      { _type: 'block', children: [{ _type: 'span', text: 'Placeholder case study. We will map your interview synthesis into a clean decision memo.' }] },
    ],
  },
  {
    title: 'TU/e — Course & Research Work (Placeholder)',
    slug: { current: 'tue-work' },
    summary: 'Placeholder for your university work. We will add 1–2 strongest projects.',
    tags: ['TU/e', 'Research'],
    organization: { name: 'TU/e', slug: { current: 'tue' } },
    role: 'Student',
    timeline: '—',
    body: [
      { _type: 'block', children: [{ _type: 'span', text: 'Placeholder. Replace with your real TU/e projects.' }] },
    ],
  },
  {
    title: 'Telkom Indonesia — UX Work (Placeholder)',
    slug: { current: 'telkom-work' },
    summary: 'Placeholder for your Telkom Indonesia projects.',
    tags: ['Telkom', 'UX'],
    organization: { name: 'Telkom Indonesia', slug: { current: 'telkom-indonesia' } },
    role: 'UX Designer',
    timeline: '—',
    body: [
      { _type: 'block', children: [{ _type: 'span', text: 'Placeholder. Replace with your real Telkom work.' }] },
    ],
  },
]

export const placeholderSiteSettings = {
  name: 'Farhan Jamaludin',
  tagline: 'UI/UX • research-driven • metrics-minded',
  heroSubtitle: 'Temporary placeholders are shown until you enter content in Sanity Studio.',
  links: [
    { label: 'Work →', url: '/work' },
    { label: 'Blog →', url: '/blog' },
    { label: 'Studio →', url: '/studio' },
  ],
  featuredWork: placeholderProjects.slice(0, 4),
}
