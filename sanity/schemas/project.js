export default {
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', maxLength: 96 }, validation: (Rule) => Rule.required() },
    { name: 'organization', title: 'Organization', type: 'reference', to: [{ type: 'organization' }], validation: (Rule) => Rule.required() },
    { name: 'date', title: 'Date', type: 'datetime' },
    { name: 'summary', title: 'Summary', type: 'text', rows: 3 },
    { name: 'tags', title: 'Tags', type: 'array', of: [{ type: 'string' }] },
    { name: 'featured', title: 'Featured on Home', type: 'boolean', initialValue: false },

    { name: 'role', title: 'Role', type: 'string' },
    { name: 'timeline', title: 'Timeline', type: 'string' },
    { name: 'tools', title: 'Tools', type: 'array', of: [{ type: 'string' }] },

    {
      name: 'body',
      title: 'Case Study Body',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
      ],
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'organization.name' },
  },
}
