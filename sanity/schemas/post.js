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
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'caption', title: 'Caption', type: 'string' },
            { name: 'alt', title: 'Alt text', type: 'string' },
          ],
        },
        {
          name: 'youtube',
          title: 'YouTube',
          type: 'object',
          fields: [
            { name: 'url', title: 'YouTube URL or ID', type: 'string', validation: (Rule) => Rule.required() },
            { name: 'title', title: 'Caption', type: 'string' },
          ],
        },
        {
          name: 'carousel',
          title: 'Carousel',
          type: 'object',
          fields: [
            { name: 'title', title: 'Title', type: 'string' },
            {
              name: 'slides',
              title: 'Slides',
              type: 'array',
              of: [
                {
                  type: 'object',
                  fields: [
                    { name: 'image', title: 'Image', type: 'image', options: { hotspot: true } },
                    { name: 'caption', title: 'Caption', type: 'string' },
                    { name: 'alt', title: 'Alt text', type: 'string' },
                  ],
                },
              ],
              validation: (Rule) => Rule.min(2).max(10),
            },
          ],
        },
      ],
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'publishedAt' },
  },
}
