export default {
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', maxLength: 96 }, validation: (Rule) => Rule.required() },
    { name: 'publishedAt', title: 'Published at', type: 'datetime' },
    { name: 'excerpt', title: 'Excerpt', type: 'text', rows: 3 },
    { name: 'tags', title: 'Tags', type: 'array', of: [{ type: 'string' }] },
    {
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
      ],
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'publishedAt' },
  },
}
