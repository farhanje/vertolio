export default {
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    { name: 'siteTitle', title: 'Site title', type: 'string' },
    { name: 'tagline', title: 'Tagline', type: 'string' },
    { name: 'bioShort', title: 'Short bio', type: 'text', rows: 3 },
    {
      name: 'contact',
      title: 'Contact',
      type: 'object',
      fields: [
        { name: 'email', title: 'Email', type: 'string' },
        { name: 'linkedin', title: 'LinkedIn URL', type: 'url' },
        { name: 'resume', title: 'Resume URL', type: 'url' },
      ],
    },
    {
      name: 'featuredProjects',
      title: 'Featured projects (Home)',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'project' }] }],
    },
  ],
};
