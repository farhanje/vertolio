const ACCENT_OPTIONS = [
  { title: 'Default', value: 'default' },
  { title: 'None (black)', value: 'none' },
  { title: 'Red', value: 'red' },
  { title: 'Yellow', value: 'yellow' },
  { title: 'Blue', value: 'blue' },
]

const CARD_RATIO = [
  { title: 'Auto', value: 'auto' },
  { title: '16:9', value: '16:9' },
  { title: '4:3', value: '4:3' },
  { title: '1:1', value: '1:1' },
]

const MEDIA_WIDTH = [
  { title: 'Text width', value: 'text' },
  { title: 'Wide', value: 'wide' },
]

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

    // Featured toggle (used on Home).
    { name: 'featured', title: 'Show on Home (Featured)', type: 'boolean', initialValue: false },

    {
      name: 'accent',
      title: 'Accent (optional)',
      type: 'string',
      options: { list: ACCENT_OPTIONS },
      initialValue: 'default',
      description: 'Used sparingly (kicker dot / small rules). Default uses Site Settings → pageAccents.projectDefault.',
    },

    {
      name: 'cardImage',
      title: 'Card image (optional)',
      type: 'image',
      options: { hotspot: true },
      fields: [
        { name: 'alt', title: 'Alt text', type: 'string' },
        { name: 'ratio', title: 'Card ratio', type: 'string', options: { list: CARD_RATIO }, initialValue: '16:9' },
      ],
      description: 'Shown on project cards. Leave empty to keep text-only cards.',
    },

    { name: 'role', title: 'Role', type: 'string' },
    { name: 'timeline', title: 'Timeline', type: 'string' },
    { name: 'tools', title: 'Tools', type: 'array', of: [{ type: 'string' }] },

    {
      name: 'body',
      title: 'Case Study Body',
      type: 'array',
      of: [
        { type: 'block' },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'caption', title: 'Caption', type: 'string' },
            { name: 'alt', title: 'Alt text', type: 'string' },
            { name: 'width', title: 'Layout', type: 'string', options: { list: MEDIA_WIDTH }, initialValue: 'text' },
            { name: 'ratio', title: 'Aspect ratio (optional)', type: 'string', options: { list: CARD_RATIO }, initialValue: 'auto' },
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
            { name: 'ratio', title: 'Carousel ratio', type: 'string', options: { list: CARD_RATIO }, initialValue: '16:9' },
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
    select: { title: 'title', subtitle: 'organization.name', media: 'cardImage' },
  },
}
