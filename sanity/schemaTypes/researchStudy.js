import HotspotArrayInput from '../components/HotspotArrayInput'
import VariantArrayInput from '../components/VariantArrayInput'

const QUESTION_TYPES = [
  {title: 'Likert 1–7', value: 'likert'},
  {title: 'Single choice', value: 'single'},
  {title: 'Multiple choice', value: 'multi'},
  {title: 'Text', value: 'text'},
  {title: 'Number', value: 'number'},
]

const QUESTION_MEDIA_TYPES = [
  {title: 'No media', value: 'none'},
  {title: 'Image upload', value: 'image'},
  {title: 'Video / embed URL', value: 'embed'},
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

const FLOW_STEP_TYPES = [
  {title: 'Question', value: 'question'},
  {title: 'Prototype task', value: 'task'},
]

const hiddenIdField = (name, title, description, hidden) => ({
  name,
  title,
  type: 'string',
  hidden: hidden || true,
  readOnly: true,
  description,
})

const resolveHidden = (hidden, args) => {
  if (typeof hidden === 'function') return hidden(args)
  return Boolean(hidden)
}

const questionFields = (hidden) => [
  hiddenIdField('questionId', 'Question ID', 'Auto-managed internally. The system falls back to this item key.', hidden),
  {name: 'label', title: 'Question label', type: 'text', rows: 2, hidden},
  {name: 'type', title: 'Question type', type: 'string', initialValue: 'likert', options: {list: QUESTION_TYPES}, hidden},
  {name: 'required', title: 'Required', type: 'boolean', initialValue: false, hidden},
  {name: 'minLabel', title: 'Likert low label', type: 'string', hidden},
  {name: 'maxLabel', title: 'Likert high label', type: 'string', hidden},
  {name: 'options', title: 'Options', type: 'array', of: [{type: 'string'}], hidden},
  {
    name: 'mediaType',
    title: 'Question media',
    type: 'string',
    initialValue: 'none',
    options: {layout: 'radio', list: QUESTION_MEDIA_TYPES},
    hidden,
  },
  {
    name: 'mediaImage',
    title: 'Question image',
    type: 'image',
    options: {hotspot: false},
    hidden: (args) => resolveHidden(hidden, args) || args.parent?.mediaType !== 'image',
  },
  {
    name: 'mediaUrl',
    title: 'Video / embed URL',
    type: 'url',
    description: 'Paste a YouTube, Vimeo, Loom, Figma prototype, or any embeddable https URL.',
    hidden: (args) => resolveHidden(hidden, args) || args.parent?.mediaType !== 'embed',
  },
  {
    name: 'mediaCaption',
    title: 'Media caption',
    type: 'string',
    hidden: (args) => resolveHidden(hidden, args) || !args.parent?.mediaType || args.parent?.mediaType === 'none',
  },
]

const hotspotFields = [
  hiddenIdField('hotspotId', 'Hotspot ID', 'Auto-managed internally. The system falls back to this item key.'),
  {name: 'label', title: 'Label', type: 'string'},
  {name: 'x', title: 'X', type: 'number', hidden: true, validation: (Rule) => Rule.min(0).max(1)},
  {name: 'y', title: 'Y', type: 'number', hidden: true, validation: (Rule) => Rule.min(0).max(1)},
  {name: 'w', title: 'Width', type: 'number', hidden: true, validation: (Rule) => Rule.min(0).max(1)},
  {name: 'h', title: 'Height', type: 'number', hidden: true, validation: (Rule) => Rule.min(0).max(1)},
  {name: 'action', title: 'Action', type: 'string', initialValue: 'next', options: {list: HOTSPOT_ACTIONS}},
  {name: 'targetScreenId', title: 'Target screen ID', type: 'string', hidden: true},
  {name: 'isCorrect', title: 'Counts as correct click', type: 'boolean', initialValue: true},
]

const screenFields = [
  hiddenIdField('screenId', 'Screen ID', 'Auto-managed internally. The system falls back to this item key.'),
  {name: 'title', title: 'Screen title', type: 'string'},
  {name: 'image', title: 'PNG image', type: 'image', options: {hotspot: false}, validation: (Rule) => Rule.required()},
  {name: 'alt', title: 'Alt text', type: 'string'},
  {name: 'isDestination', title: 'Destination page / success screen', type: 'boolean', initialValue: false},
  {name: 'completionDelaySeconds', title: 'Auto-complete delay (seconds)', type: 'number', initialValue: 1.5, hidden: ({parent}) => !parent?.isDestination, validation: (Rule) => Rule.min(0.2).max(10)},
  {
    name: 'hotspots',
    title: 'Hotspots',
    type: 'array',
    components: {input: HotspotArrayInput},
    of: [{type: 'object', name: 'studyHotspot', title: 'Hotspot', fields: hotspotFields, preview: {select: {title: 'label', subtitle: 'hotspotId'}}}],
  },
]

const screensField = (hidden) => ({
  name: 'screens',
  title: 'PNG screens',
  type: 'array',
  hidden,
  of: [{type: 'object', name: 'studyScreen', title: 'Screen', fields: screenFields, preview: {select: {title: 'title', media: 'image'}}}],
})

const postTaskSurveyField = (hidden) => ({
  name: 'postTaskSurvey',
  title: 'Post-task survey',
  type: 'array',
  hidden,
  of: [{type: 'object', name: 'studyQuestion', title: 'Question', fields: questionFields(), preview: {select: {title: 'label', subtitle: 'type'}}}],
})

const taskFields = (hidden, includeTitle = true) => [
  hiddenIdField('taskId', 'Task ID', 'Auto-managed internally. The system falls back to this item key.', hidden),
  ...(includeTitle ? [{name: 'title', title: 'Task title', type: 'string', hidden}] : []),
  {name: 'scenario', title: 'Scenario', type: 'text', rows: 4, hidden},
  screensField(hidden),
  postTaskSurveyField(hidden),
]

const hideUnlessQuestion = ({parent}) => parent?.stepType !== 'question'
const hideUnlessTask = ({parent}) => parent?.stepType !== 'task'

export default {
  name: 'researchStudy',
  title: 'Research Study',
  type: 'document',
  fields: [
    {name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'slug', title: 'Slug', type: 'slug', options: {source: 'title', maxLength: 96}, validation: (Rule) => Rule.required()},
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      initialValue: 'draft',
      options: {layout: 'radio', list: [{title: 'Draft', value: 'draft'}, {title: 'Active', value: 'active'}, {title: 'Paused', value: 'paused'}, {title: 'Archived', value: 'archived'}]},
      validation: (Rule) => Rule.required(),
    },
    {name: 'researchType', title: 'Research type', type: 'string', initialValue: 'usability_test', options: {layout: 'radio', list: RESEARCH_TYPES}, validation: (Rule) => Rule.required()},
    {name: 'introTitle', title: 'Intro title', type: 'string', initialValue: 'Before we start'},
    {name: 'introBody', title: 'Intro body', type: 'text', rows: 4},
    {name: 'consentText', title: 'Consent text', type: 'text', rows: 4},
    {name: 'completionTitle', title: 'Completion title', type: 'string', initialValue: 'Thank you'},
    {name: 'completionBody', title: 'Completion body', type: 'text', rows: 3},
    {
      name: 'variants',
      title: 'Variants',
      type: 'array',
      components: {input: VariantArrayInput},
      validation: (Rule) => Rule.min(1).required(),
      of: [{
        type: 'object',
        name: 'studyVariant',
        title: 'Study variant',
        fields: [
          {name: 'key', title: 'Variant key', type: 'string', validation: (Rule) => Rule.required()},
          {name: 'label', title: 'Label', type: 'string'},
          {
            name: 'flowSteps',
            title: 'Study flow',
            type: 'array',
            description: 'Main builder. Drag items up/down to decide the participant order. If empty, Legacy tasks below are used.',
            of: [{
              type: 'object',
              name: 'studyFlowStep',
              title: 'Flow step',
              fields: [
                {name: 'stepType', title: 'Step type', type: 'string', initialValue: 'task', options: {layout: 'radio', list: FLOW_STEP_TYPES}},
                {name: 'stepTitle', title: 'Step title', type: 'string'},
                ...questionFields(hideUnlessQuestion),
                ...taskFields(hideUnlessTask, false),
              ],
              preview: {
                select: {stepType: 'stepType', title: 'stepTitle', question: 'label'},
                prepare({stepType, title, question}) {
                  const label = stepType === 'question' ? 'Question' : 'Prototype task'
                  return {title: title || question || label, subtitle: label}
                },
              },
            }],
          },
          {name: 'tasks', title: 'Legacy tasks', type: 'array', description: 'Fallback for older studies. New studies should use Study flow above.', of: [{type: 'object', name: 'studyTask', title: 'Task', fields: taskFields(), preview: {select: {title: 'title'}}}]},
        ],
        preview: {select: {title: 'label', subtitle: 'key'}},
      }],
    },
  ],
  preview: {select: {title: 'title', subtitle: 'slug.current'}},
}
