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
      { _type: 'block', children: [{ _type: 'span', text: 'Placeholder case study. Replace with your real narrative and metrics.' }] },
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
      { _type: 'block', children: [{ _type: 'span', text: 'Placeholder. Add variants and results.' }] },
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
      { _type: 'block', children: [{ _type: 'span', text: 'Placeholder. Add cost/hit and edit-rate metrics + redacted screenshot.' }] },
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
      { _type: 'block', children: [{ _type: 'span', text: 'Placeholder. Convert interview synthesis into a decision memo.' }] },
    ],
  },
]

export const placeholderPosts = [
  {
    title: 'Hello (Placeholder)',
    slug: { current: 'hello' },
    excerpt: 'A starter post to validate the blog structure.',
    tags: ['Writing'],
    publishedAt: new Date().toISOString(),
  },
]

export const placeholderSiteSettings = {
  name: 'Farhan Jamaludin',
  tagline: 'UI/UX • research-driven • metrics-minded',
  heroSubtitle: 'Temporary placeholders are shown until you enter content in Sanity Studio.',
  heroTickerWords: ['Welcome to my website folks!', 'Swiss grid', 'Research-driven', 'Clear systems', 'Measured outcomes'],
  links: [
    { label: 'Work →', url: '/work' },
    { label: 'Blog →', url: '/blog' },
  ],
  featuredWork: placeholderProjects,
  featuredPosts: placeholderPosts,
}
