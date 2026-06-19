import HotspotArrayInput from '../components/HotspotArrayInput'

const QUESTION_TYPES = [
  {title: 'Likert 1–7', value: 'likert'},
  {title: 'Single choice', value: 'single'},
  {title: 'Multiple choice', value: 'multi'},
  {title: 'Text', value: 'text'},
  {title: 'Number', value: 'number'},
]

const RESEARCH_TYPES = [
  {title: 'A/B test', value: 'ab_test'},
  {title: 'Usability testing', value: 'usability_test'},
  {title: 'Survey', value: 'survey'},
  {title: 'Prototype test', value: 'prototype_test'},
  {title: 'Concept test', value: 'concept_test'},
]

const HOTSPOT_ACTIONS = [
  {title: 'Next screen', value: 'next'},
  {title: 'Go to screen', value: 'goToScreen'},
  {title: 'Back', value: 'back'},
  {title: 'Complete task', value: 'completeTask'},
]

const hiddenIdField = (name, title, description) => ({
  name,
  title,
  type: 'string',
  hidden: true,
  readOnly: true,
  description,
})

export default {
  name: 'researchStudy',
  title: 'Research Study',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      initialValue: 'draft',
      options: {
        layout: 'radio',
        list: [
          {title: 'Draft', value: 'draft'},
          {title: 'Active', value: 'active'},
          {title: 'Paused', value: 'paused'},
          {title: 'Archived', value: 'archived'},
        ],
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'researchType',
      title: 'Research type',
      type: 'string',
      initialValue: 'usability_test',
      description: 'Choose the study mode before publishing. This keeps the research setup explicit and helps the runner/export logic later.',
      options: {
        layout: 'radio',
        list: RESEARCH_TYPES,
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'introTitle',
      title: 'Intro title',
      type: 'string',
      initialValue: 'Before we start',
    },
    {
      name: 'introBody',
      title: 'Intro body',
      type: 'text',
      rows: 4,
    },
    {
      name: 'consentText',
      title: 'Consent text',
      type: 'text',
      rows: 4,
      description: 'Shown before the participant starts the task flow.',
    },
    {
      name: 'completionTitle',
      title: 'Completion title',
      type: 'string',
      initialValue: 'Thank you',
    },
    {
      name: 'completionBody',
      title: 'Completion body',
      type: 'text',
      rows: 3,
    },
    {
      name: 'variants',
      title: 'Variants',
      type: 'array',
      validation: (Rule) => Rule.min(1).required(),
      of: [
        {
          type: 'object',
          name: 'studyVariant',
          title: 'Study variant',
          fields: [
            {
              name: 'key',
              title: 'Variant key',
              type: 'string',
              description: 'Use A or B for the current AB assignment logic.',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'label',
              title: 'Label',
              type: 'string',
            },
            {
              name: 'tasks',
              title: 'Tasks',
              type: 'array',
              validation: (Rule) => Rule.min(1).required(),
              of: [
                {
                  type: 'object',
                  name: 'studyTask',
                  title: 'Task',
                  fields: [
                    hiddenIdField('taskId', 'Task ID', 'Auto-managed internally. The system falls back to this item key.'),
                    {
                      name: 'title',
                      title: 'Task title',
                      type: 'string',
                      validation: (Rule) => Rule.required(),
                    },
                    {
                      name: 'scenario',
                      title: 'Scenario',
                      type: 'text',
                      rows: 4,
                    },
                    {
                      name: 'screens',
                      title: 'PNG screens',
                      type: 'array',
                      validation: (Rule) => Rule.min(1).required(),
                      of: [
                        {
                          type: 'object',
                          name: 'studyScreen',
                          title: 'Screen',
                          fields: [
                            hiddenIdField('screenId', 'Screen ID', 'Auto-managed internally. The system falls back to this item key.'),
                            {
                              name: 'title',
                              title: 'Screen title',
                              type: 'string',
                              description: 'Optional. Only used to make the Studio list easier to read.',
                            },
                            {
                              name: 'image',
                              title: 'PNG image',
                              type: 'image',
                              options: {hotspot: false},
                              validation: (Rule) => Rule.required(),
                            },
                            {
                              name: 'alt',
                              title: 'Alt text',
                              type: 'string',
                            },
                            {
                              name: 'isDestination',
                              title: 'Destination page / success screen',
                              type: 'boolean',
                              initialValue: false,
                              description: 'Turn this on when arriving at this screen should automatically complete the task.',
                            },
                            {
                              name: 'completionDelaySeconds',
                              title: 'Auto-complete delay (seconds)',
                              type: 'number',
                              initialValue: 1.5,
                              hidden: ({parent}) => !parent?.isDestination,
                              description: 'After the participant reaches this screen, the task will be marked complete after this delay.',
                              validation: (Rule) => Rule.min(0.2).max(10),
                            },
                            {
                              name: 'hotspots',
                              title: 'Hotspots',
                              type: 'array',
                              description: 'Draw, drag, and resize hotspot rectangles directly on the uploaded PNG. No pixel math needed.',
                              components: {input: HotspotArrayInput},
                              of: [
                                {
                                  type: 'object',
                                  name: 'studyHotspot',
                                  title: 'Hotspot',
                                  fields: [
                                    hiddenIdField('hotspotId', 'Hotspot ID', 'Auto-managed internally. The system falls back to this item key.'),
                                    {name: 'label', title: 'Label', type: 'string'},
                                    {
                                      name: 'x',
                                      title: 'X',
                                      type: 'number',
                                      hidden: true,
                                      validation: (Rule) => Rule.min(0).max(1),
                                    },
                                    {
                                      name: 'y',
                                      title: 'Y',
                                      type: 'number',
                                      hidden: true,
                                      validation: (Rule) => Rule.min(0).max(1),
                                    },
                                    {
                                      name: 'w',
                                      title: 'Width',
                                      type: 'number',
                                      hidden: true,
                                      validation: (Rule) => Rule.min(0).max(1),
                                    },
                                    {
                                      name: 'h',
                                      title: 'Height',
                                      type: 'number',
                                      hidden: true,
                                      validation: (Rule) => Rule.min(0).max(1),
                                    },
                                    {
                                      name: 'action',
                                      title: 'Action',
                                      type: 'string',
                                      initialValue: 'next',
                                      options: {list: HOTSPOT_ACTIONS},
                                    },
                                    {
                                      name: 'targetScreenId',
                                      title: 'Target screen ID',
                                      type: 'string',
                                      hidden: true,
                                      description: 'Used only when action = Go to screen. The visual hotspot editor sets this from a screen dropdown.',
                                    },
                                    {
                                      name: 'isCorrect',
                                      title: 'Counts as correct click',
                                      type: 'boolean',
                                      initialValue: true,
                                    },
                                  ],
                                  preview: {
                                    select: {title: 'label', subtitle: 'hotspotId'},
                                    prepare({title, subtitle}) {
                                      return {title: title || 'Hotspot', subtitle}
                                    },
                                  },
                                },
                              ],
                            },
                          ],
                          preview: {
                            select: {title: 'title', media: 'image', isDestination: 'isDestination'},
                            prepare({title, media, isDestination}) {
                              return {title: title || 'Screen', subtitle: isDestination ? 'Destination / success screen' : undefined, media}
                            },
                          },
                        },
                      ],
                    },
                    {
                      name: 'postTaskSurvey',
                      title: 'Post-task survey',
                      type: 'array',
                      of: [
                        {
                          type: 'object',
                          name: 'studyQuestion',
                          title: 'Question',
                          fields: [
                            hiddenIdField('questionId', 'Question ID', 'Auto-managed internally. The system falls back to this item key.'),
                            {
                              name: 'label',
                              title: 'Question label',
                              type: 'text',
                              rows: 2,
                              validation: (Rule) => Rule.required(),
                            },
                            {
                              name: 'type',
                              title: 'Question type',
                              type: 'string',
                              initialValue: 'likert',
                              options: {list: QUESTION_TYPES},
                              validation: (Rule) => Rule.required(),
                            },
                            {
                              name: 'required',
                              title: 'Required',
                              type: 'boolean',
                              initialValue: false,
                            },
                            {
                              name: 'minLabel',
                              title: 'Likert low label',
                              type: 'string',
                            },
                            {
                              name: 'maxLabel',
                              title: 'Likert high label',
                              type: 'string',
                            },
                            {
                              name: 'options',
                              title: 'Options',
                              type: 'array',
                              of: [{type: 'string'}],
                            },
                          ],
                          preview: {
                            select: {title: 'label', subtitle: 'type'},
                          },
                        },
                      ],
                    },
                  ],
                  preview: {
                    select: {title: 'title'},
                    prepare({title}) {
                      return {title: title || 'Task'}
                    },
                  },
                },
              ],
            },
          ],
          preview: {
            select: {title: 'label', subtitle: 'key'},
            prepare({title, subtitle}) {
              return {title: title || `Variant ${subtitle || ''}`, subtitle}
            },
          },
        },
      ],
    },
  ],
  preview: {
    select: {title: 'title', subtitle: 'slug.current'},
  },
}
