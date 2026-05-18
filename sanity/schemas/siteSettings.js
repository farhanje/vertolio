export default {
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    { name: 'name', title: 'Name', type: 'string' },
    { name: 'tagline', title: 'Tagline', type: 'string' },
    { name: 'heroSubtitle', title: 'Hero subtitle', type: 'text', rows: 2 },
    { name: 'links', title: 'Links', type: 'array', of: [{ type: 'object', fields: [
      { name: 'label', title: 'Label', type: 'string' },
      { name: 'url', title: 'URL', type: 'url' },
    ]}] },
    { name: 'featuredWork', title: 'Featured work', type: 'array', of: [{ type: 'reference', to: [{ type: 'project' }] }] },
  ],
}
