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
      name: 'resumePdf',
      title: 'Resume PDF',
      type: 'file',
      options: { accept: 'application/pdf' },
      description: 'Upload your resume as a PDF. Shown on /resume.',
    },

    { name: 'links', title: 'Links', type: 'array', of: [{ type: 'object', fields: [
      { name: 'label', title: 'Label', type: 'string' },
      { name: 'url', title: 'URL', type: 'url' },
    ]}] },

    { name: 'featuredWork', title: 'Featured work (projects)', type: 'array', of: [{ type: 'reference', to: [{ type: 'project' }] }] },
    { name: 'featuredPosts', title: 'Featured posts (blog)', type: 'array', of: [{ type: 'reference', to: [{ type: 'post' }] }] },
  ],
}
