export default {
  name: 'organization',
  title: 'Organization',
  type: 'document',
  fields: [
    { name: 'name', title: 'Name', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'name', maxLength: 96 }, validation: (Rule) => Rule.required() },
    { name: 'order', title: 'Order', type: 'number', initialValue: 1 },
    { name: 'note', title: 'Note', type: 'string', description: 'Optional: timeframe/role summary' },
  ],
  preview: {
    select: { title: 'name', subtitle: 'note' },
  },
}
