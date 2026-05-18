export default {
  name: 'organization',
  title: 'Organization',
  type: 'document',
  fields: [
    { name: 'title', title: 'Name', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', maxLength: 96 } },
    { name: 'order', title: 'Order', type: 'number', description: 'Lower number shows first' },
    { name: 'subtitle', title: 'Subtitle (optional)', type: 'string' },
    { name: 'role', title: 'Your role (optional)', type: 'string' },
    { name: 'timeframe', title: 'Timeframe (optional)', type: 'string' },
  ],
};
