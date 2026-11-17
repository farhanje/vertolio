import {defineType, defineField, defineArrayMember} from 'sanity'

const photoFields = [
  defineField({name: 'alt', type: 'string', title: 'Alternative text'}),
  defineField({name: 'caption', type: 'string'}),
]

function isComplete(document) {
  const hasHero = Boolean(document?.heroImage?.asset?._ref)
  const hasChapter = (document?.chapters || []).some((chapter) => {
    if (chapter?._type === 'birthdayStoryChapter') return (chapter.body || []).length > 0
    if (chapter?._type === 'birthdayPhotoCollage') return (chapter.photos || []).some((p) => p?.asset?._ref)
    if (chapter?._type === 'birthdayQuote') return Boolean(chapter.quote?.trim())
    return false
  })
  return hasHero && hasChapter
}

const readinessValidation = (enabled, context) => {
  if (enabled !== true || isComplete(context.document)) return true
  return 'Add a hero photograph and at least one populated story block before making the birthday experience public.'
}

export default defineType({
  name: 'birthdayExperience',
  title: "Ema's Birthday",
  type: 'document',
  initialValue: {
    active: false,
    keepStoryPublic: false,
    title: 'For Ema, With Love.',
    heroSubtitle: 'A little corner of the internet, just for you.',
    entryLabel: 'Enter our story',
    introLines: [
      'Usually, this little corner of the internet is about me.',
      'But not today.',
      "Today, it's all about her.",
    ],
    chapters: [],
  },
  fields: [
    defineField({
      name: 'active',
      title: 'Homepage birthday takeover — ACTIVE',
      type: 'boolean',
      description: 'OFF = normal homepage. ON = birthday opening on farhanje.com only, once the story has a hero photo and at least one populated chapter. Publish to apply.',
      initialValue: false,
      validation: (Rule) => Rule.custom(readinessValidation),
    }),
    defineField({
      name: 'keepStoryPublic',
      title: 'Keep /dear-ema available after the takeover',
      type: 'boolean',
      description: 'Optional. Leave OFF while preparing the surprise. After launch, turn ON to keep the story accessible when the homepage takeover ends.',
      initialValue: false,
      validation: (Rule) => Rule.custom(readinessValidation),
    }),
    defineField({name: 'title', type: 'string', title: 'Story title'}),
    defineField({name: 'heroSubtitle', type: 'text', rows: 2}),
    defineField({
      name: 'introLines',
      title: 'Portfolio-to-birthday transition lines',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      validation: (Rule) => Rule.max(3),
      description: 'Up to three short lines appearing after the brief glimpse of the real portfolio homepage.',
    }),
    defineField({
      name: 'heroImage',
      title: 'Birthday hero portrait',
      type: 'image',
      options: {hotspot: true},
      fields: photoFields,
      description: 'Required before activation. You can leave this empty for now.',
    }),
    defineField({name: 'entryLabel', type: 'string', title: 'Story entry button label'}),
    defineField({
      name: 'soundtrack',
      title: 'Background song (optional)',
      type: 'file',
      options: {accept: 'audio/*'},
      description: 'Upload a song you have permission to publish. Playback is user-initiated to comply with browser autoplay rules.',
    }),
    defineField({name: 'soundtrackTitle', type: 'string', title: 'Soundtrack title (optional)'}),
    defineField({
      name: 'chapters',
      title: 'Story and photo sections',
      type: 'array',
      description: 'Reorder chapters or mix writing, photographic collages, and short quotes. You can curate everything later.',
      of: [
        defineArrayMember({
          name: 'birthdayStoryChapter',
          type: 'object',
          title: 'Written chapter',
          fields: [
            defineField({name: 'heading', type: 'string'}),
            defineField({name: 'body', type: 'array', of: [defineArrayMember({type: 'block'})]}),
            defineField({name: 'image', type: 'image', options: {hotspot: true}, fields: photoFields}),
          ],
          preview: {select: {title: 'heading'}, prepare: ({title}) => ({title: title || 'Written chapter'})},
        }),
        defineArrayMember({
          name: 'birthdayPhotoCollage',
          type: 'object',
          title: 'Photo collage',
          fields: [
            defineField({name: 'heading', type: 'string'}),
            defineField({
              name: 'photos',
              type: 'array',
              of: [defineArrayMember({type: 'image', options: {hotspot: true}, fields: photoFields})],
            }),
          ],
          preview: {select: {title: 'heading'}, prepare: ({title}) => ({title: title || 'Photo collage'})},
        }),
        defineArrayMember({
          name: 'birthdayQuote',
          type: 'object',
          title: 'Short note / quote',
          fields: [
            defineField({name: 'quote', type: 'text', rows: 4}),
            defineField({name: 'attribution', type: 'string'}),
          ],
          preview: {select: {title: 'quote'}, prepare: ({title}) => ({title: title || 'Short note'})},
        }),
      ],
    }),
  ],
  preview: {
    select: {active: 'active', title: 'title'},
    prepare: ({active, title}) => ({title: title || "Ema's Birthday", subtitle: active ? 'Homepage takeover ON' : 'Homepage takeover OFF'}),
  },
})
