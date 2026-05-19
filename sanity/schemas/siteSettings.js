const ACCENT_OPTIONS = [
  { title: 'None (black)', value: 'none' },
  { title: 'Red', value: 'red' },
  { title: 'Yellow', value: 'yellow' },
  { title: 'Blue', value: 'blue' },
]

export default {
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    { name: 'name', title: 'Name', type: 'string' },
    { name: 'tagline', title: 'Tagline', type: 'string' },
    { name: 'heroSubtitle', title: 'Hero subtitle', type: 'text', rows: 2 },

    {
      name: 'heroTickerWords',
      title: 'Hero ticker words (optional)',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Words that loop subtly behind the hero. Keep it short and punchy.',
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
          fields: [
            { name: 'label', title: 'Label', type: 'string' },
            { name: 'url', title: 'URL', type: 'url' },
          ],
        },
      ],
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
