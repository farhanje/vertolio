const ACCENT_OPTIONS = [
  { title: 'None (black)', value: 'none' },
  { title: 'Red', value: 'red' },
  { title: 'Yellow', value: 'yellow' },
  { title: 'Blue', value: 'blue' },
]

const EN_FALLBACK_NOTE = 'Optional native English. Leave empty to keep the current Google Translate fallback until the English portfolio copy is revised.'

const LINK_FIELDSET = [
  { name: 'label', title: 'Label — Indonesian', type: 'string' },
  { name: 'labelEn', title: 'Label — English', type: 'string', description: EN_FALLBACK_NOTE },
  {
    name: 'url',
    title: 'URL',
    type: 'string',
    description: 'Supports https://, mailto:, tel:, and relative paths like /work.',
    validation: (Rule) =>
      Rule.required().custom((v) => {
        if (!v) return 'Required'
        const s = String(v).trim()
        if (s.startsWith('mailto:')) return true
        if (s.startsWith('tel:')) return true
        if (s.startsWith('/')) return true
        if (s.startsWith('https://')) return true
        if (s.startsWith('http://')) return true
        return 'Use https://, mailto:, tel:, or /path'
      }),
  },
]

export default {
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    { name: 'name', title: 'Name', type: 'string' },
    { name: 'tagline', title: 'Tagline — Indonesian', type: 'string' },
    { name: 'taglineEn', title: 'Tagline — English', type: 'string', description: EN_FALLBACK_NOTE },
    { name: 'heroSubtitle', title: 'Hero subtitle — Indonesian', type: 'text', rows: 2 },
    { name: 'heroSubtitleEn', title: 'Hero subtitle — English', type: 'text', rows: 2, description: EN_FALLBACK_NOTE },

    // Brand assets
    {
      name: 'brandLogo',
      title: 'Brand logo (navbar)',
      type: 'image',
      options: { hotspot: true },
      fields: [
        { name: 'alt', title: 'Alt text — Indonesian', type: 'string' },
        { name: 'altEn', title: 'Alt text — English', type: 'string', description: EN_FALLBACK_NOTE },
      ],
      description: 'Shown in desktop navbar and mobile drawer. Recommended: simple mark/logo, transparent PNG or SVG, ~256×256.',
    },
    {
      name: 'favicon',
      title: 'Favicon (browser tab)',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', title: 'Alt text', type: 'string' }],
      description: 'Recommended: 64×64 or 128×128 PNG (square) or SVG. Used as site icon.',
    },

    // Hero portrait (art-directed)
    {
      name: 'heroPortraitDesktop',
      title: 'Hero portrait (Desktop) — recommended 4:5 or 3:4',
      type: 'image',
      options: { hotspot: true },
      fields: [
        { name: 'alt', title: 'Alt text — Indonesian', type: 'string' },
        { name: 'altEn', title: 'Alt text — English', type: 'string', description: EN_FALLBACK_NOTE },
      ],
      description: 'Used on desktop hero. Suggested: 1200×1500 (4:5) or 1200×1600 (3:4).',
    },
    {
      name: 'heroPortraitMobile',
      title: 'Hero portrait (Mobile/Tablet) — recommended 3:2 or 16:9',
      type: 'image',
      options: { hotspot: true },
      fields: [
        { name: 'alt', title: 'Alt text — Indonesian', type: 'string' },
        { name: 'altEn', title: 'Alt text — English', type: 'string', description: EN_FALLBACK_NOTE },
      ],
      description: 'Used on mobile/tablet hero. Suggested: 1600×1067 (3:2) or 1600×900 (16:9).',
    },

    // About page (Sanity-driven)
    {
      name: 'about',
      title: 'About page',
      type: 'object',
      fields: [
        { name: 'kicker', title: 'Kicker — Indonesian', type: 'string', initialValue: 'Farhan Fauzan Jamaludin' },
        { name: 'kickerEn', title: 'Kicker — English', type: 'string', description: EN_FALLBACK_NOTE },
        { name: 'title', title: 'Title — Indonesian', type: 'string', initialValue: 'About' },
        { name: 'titleEn', title: 'Title — English', type: 'string', description: EN_FALLBACK_NOTE },
        { name: 'lead', title: 'Lead text — Indonesian', type: 'text', rows: 3 },
        { name: 'leadEn', title: 'Lead text — English', type: 'text', rows: 3, description: EN_FALLBACK_NOTE },
        {
          name: 'buttons',
          title: 'Buttons',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                ...LINK_FIELDSET,
                {
                  name: 'style',
                  title: 'Style',
                  type: 'string',
                  options: {
                    list: [
                      { title: 'Primary', value: 'primary' },
                      { title: 'Secondary', value: 'secondary' },
                    ],
                  },
                  initialValue: 'secondary',
                },
              ],
            },
          ],
        },
        { name: 'body', title: 'Body — Indonesian', type: 'array', of: [{ type: 'block' }] },
        { name: 'bodyEn', title: 'Body — English', type: 'array', of: [{ type: 'block' }], description: EN_FALLBACK_NOTE },
        {
          name: 'images',
          title: 'Images (gallery)',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                {
                  name: 'image',
                  title: 'Image',
                  type: 'image',
                  options: { hotspot: true },
                  fields: [
                    { name: 'alt', title: 'Alt text — Indonesian', type: 'string' },
                    { name: 'altEn', title: 'Alt text — English', type: 'string', description: EN_FALLBACK_NOTE },
                  ],
                },
                { name: 'caption', title: 'Caption — Indonesian', type: 'string' },
                { name: 'captionEn', title: 'Caption — English', type: 'string', description: EN_FALLBACK_NOTE },
              ],
            },
          ],
          description: 'Optional image grid shown on /about. Use 2–6 images. Recommended: 1200px wide or more.',
        },
      ],
    },

    // SEO / Metadata
    {
      name: 'seo',
      title: 'SEO / Metadata',
      type: 'object',
      fields: [
        { name: 'siteTitle', title: 'Site title — Indonesian', type: 'string', description: 'Shown in browser tab and search results.' },
        { name: 'siteTitleEn', title: 'Site title — English', type: 'string', description: EN_FALLBACK_NOTE },
        { name: 'siteDescription', title: 'Site description — Indonesian', type: 'text', rows: 2 },
        { name: 'siteDescriptionEn', title: 'Site description — English', type: 'text', rows: 2, description: EN_FALLBACK_NOTE },
        {
          name: 'ogImage',
          title: 'Open Graph image (share preview) — recommended 1200×630',
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'alt', title: 'Alt text — Indonesian', type: 'string' },
            { name: 'altEn', title: 'Alt text — English', type: 'string', description: EN_FALLBACK_NOTE },
          ],
        },
        {
          name: 'commentsRepo',
          title: 'Comments repo (utterances)',
          type: 'string',
          description: 'Format: owner/repo. Example: farhanje/vertolio. This repo must have utterances installed.',
        },
      ],
    },

    {
      name: 'heroTickerWords',
      title: 'Hero ticker words — Indonesian (optional)',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Words that loop subtly behind the hero. Keep it short and punchy.',
    },
    {
      name: 'heroTickerWordsEn',
      title: 'Hero ticker words — English (optional)',
      type: 'array',
      of: [{ type: 'string' }],
      description: EN_FALLBACK_NOTE,
    },

    {
      name: 'pageAccents',
      title: 'Page accents (optional)',
      type: 'object',
      description: 'Small Swiss poster accents (used sparingly: kicker dot / tiny rules).',
      fields: [
        { name: 'home', title: 'Home', type: 'string', options: { list: ACCENT_OPTIONS } },
        { name: 'work', title: 'Work', type: 'string', options: { list: ACCENT_OPTIONS } },
        { name: 'blog', title: 'Blog', type: 'string', options: { list: ACCENT_OPTIONS } },
        { name: 'about', title: 'About', type: 'string', options: { list: ACCENT_OPTIONS } },
        { name: 'resume', title: 'Resume', type: 'string', options: { list: ACCENT_OPTIONS } },
        { name: 'projectDefault', title: 'Project detail default', type: 'string', options: { list: ACCENT_OPTIONS } },
        { name: 'postDefault', title: 'Post detail default', type: 'string', options: { list: ACCENT_OPTIONS } },
      ],
    },

    {
      name: 'resumePdf',
      title: 'Resume PDF',
      type: 'file',
      options: { accept: 'application/pdf' },
      description: 'Upload your resume as a PDF. Shown on /resume.',
    },

    {
      name: 'links',
      title: 'Links',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: LINK_FIELDSET,
        },
      ],
    },

    {
      name: 'footerLinks',
      title: 'Footer icon links',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'label', title: 'Label (tooltip) — Indonesian', type: 'string' },
            { name: 'labelEn', title: 'Label (tooltip) — English', type: 'string', description: EN_FALLBACK_NOTE },
            {
              name: 'url',
              title: 'URL',
              type: 'string',
              description: 'Supports https://, mailto:, tel:, and relative paths like /work.',
              validation: (Rule) =>
                Rule.required().custom((v) => {
                  if (!v) return 'Required'
                  const s = String(v).trim()
                  if (s.startsWith('mailto:')) return true
                  if (s.startsWith('tel:')) return true
                  if (s.startsWith('/')) return true
                  if (s.startsWith('https://')) return true
                  if (s.startsWith('http://')) return true
                  return 'Use https://, mailto:, tel:, or /path'
                }),
            },
            {
              name: 'icon',
              title: 'Icon (square)',
              type: 'image',
              options: { hotspot: true },
              fields: [
                { name: 'alt', title: 'Alt text — Indonesian', type: 'string' },
                { name: 'altEn', title: 'Alt text — English', type: 'string', description: EN_FALLBACK_NOTE },
              ],
            },
          ],
        },
      ],
      description: 'Upload any icons (LinkedIn, Gmail, Instagram, etc.) and link them.',
    },

    {
      name: 'featuredWork',
      title: 'Featured work (projects)',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'project' }] }],
      validation: (Rule) => Rule.max(4),
    },
    {
      name: 'featuredPosts',
      title: 'Featured posts (blog)',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'post' }] }],
      validation: (Rule) => Rule.max(4),
    },
  ],
}
