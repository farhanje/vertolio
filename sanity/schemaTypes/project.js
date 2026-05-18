export default {
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', maxLength: 96 } },
    {
      name: 'organization',
      title: 'Organization',
      type: 'reference',
      to: [{ type: 'organization' }],
      validation: (Rule) => Rule.required(),
    },
    { name: 'summary', title: 'Summary (card)', type: 'text', rows: 3 },
    { name: 'tags', title: 'Tags', type: 'array', of: [{ type: 'string' }], options: { layout: 'tags' } },
    { name: 'featured', title: 'Featured on home', type: 'boolean' },
    { name: 'thumb', title: 'Thumbnail', type: 'image', options: { hotspot: true } },
    {
      name: 'facts',
      title: 'Facts',
      type: 'object',
      fields: [
        { name: 'role', title: 'Role', type: 'string' },
        { name: 'timeline', title: 'Timeline', type: 'string' },
        { name: 'methods', title: 'Methods', type: 'array', of: [{ type: 'string' }] },
      ],
    },
    {
      name: 'content',
      title: 'Case study content',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
      ],
    },
  ],
};
