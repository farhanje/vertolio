const QUESTION_TYPES = [
  {title: 'Likert 1–7', value: 'likert'},
  {title: 'Single choice', value: 'single'},
  {title: 'Multiple choice', value: 'multi'},
  {title: 'Text', value: 'text'},
  {title: 'Number', value: 'number'},
]

const HOTSPOT_ACTIONS = [
  {title: 'Next screen', value: 'next'},
  {title: 'Go to screen', value: 'goToScreen'},
  {title: 'Back', value: 'back'},
  {title: 'Complete task', value: 'completeTask'},
]

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
                    {
                      name: 'taskId',
                      title: 'Task ID',
                      type: 'string',
                      description: 'Stable ID, e.g. task_1_take_ktp.',
                      validation: (Rule) => Rule.required(),
                    },
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
                            {
                              name: 'screenId',
                              title: 'Screen ID',
                              type: 'string',
                              description: 'Stable ID used by hotspots, e.g. a_home.',
                              validation: (Rule) => Rule.required(),
                            },
                            {
                              name: 'title',
                              title: 'Screen title',
                              type: 'string',
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
                              name: 'hotspots',
                              title: 'Hotspots',
                              type: 'array',
                              description: 'Use normalized decimal values from 0 to 1. x/y = top-left. w/h = width/height.',
                              of: [
                                {
                                  type: 'object',
                                  name: 'studyHotspot',
                                  title: 'Hotspot',
                                  fields: [
                                    {
                                      name: 'hotspotId',
                                      title: 'Hotspot ID',
                                      type: 'string',
                                      validation: (Rule) => Rule.required(),
                                    },
                                    {name: 'label', title: 'Label', type: 'string'},
                                    {
                                      name: 'x',
                                      title: 'X',
                                      type: 'number',
                                      validation: (Rule) => Rule.min(0).max(1).required(),
                                    },
                                    {
                                      name: 'y',
                                      title: 'Y',
                                      type: 'number',
                                      validation: (Rule) => Rule.min(0).max(1).required(),
                                    },
                                    {
                                      name: 'w',
                                      title: 'Width',
                                      type: 'number',
                                      validation: (Rule) => Rule.min(0).max(1).required(),
                                    },
                                    {
                                      name: 'h',
                                      title: 'Height',
                                      type: 'number',
                                      validation: (Rule) => Rule.min(0).max(1).required(),
                                    },
                                    {
                                      name: 'action',
                                      title: 'Action',
                                      type: 'string',
                                      initialValue: 'next',
                                      options: {list: HOTSPOT_ACTIONS},
                                      validation: (Rule) => Rule.required(),
                                    },
                                    {
                                      name: 'targetScreenId',
                                      title: 'Target screen ID',
                                      type: 'string',
                                      description: 'Required only when action = Go to screen.',
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
                                      return {title: title || subtitle || 'Hotspot', subtitle}
                                    },
                                  },
                                },
                              ],
                            },
                          ],
                          preview: {
                            select: {title: 'title', subtitle: 'screenId', media: 'image'},
                            prepare({title, subtitle, media}) {
                              return {title: title || subtitle || 'Screen', subtitle, media}
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
                            {
                              name: 'questionId',
                              title: 'Question ID',
                              type: 'string',
                              validation: (Rule) => Rule.required(),
                            },
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
                    select: {title: 'title', subtitle: 'taskId'},
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
