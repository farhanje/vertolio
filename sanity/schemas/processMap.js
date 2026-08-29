const THEME_OPTIONS = [
  {title: 'Light', value: 'light'},
  {title: 'Dark artifact room', value: 'dark'},
]

const processStage = {
  name: 'processStage',
  title: 'Process stage',
  type: 'object',
  fields: [
    {
      name: 'key',
      title: 'Stage key',
      type: 'string',
      validation: (Rule) => Rule.required().regex(/^[a-z0-9][a-z0-9-]*$/, {name: 'lowercase kebab-case'}),
    },
    {name: 'label', title: 'Stage label', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'caption', title: 'Stage caption', type: 'string'},
  ],
  preview: {select: {title: 'label', subtitle: 'caption'}},
}

const processCell = {
  name: 'processCell',
  title: 'Process cell',
  type: 'object',
  fields: [
    {name: 'stageKey', title: 'Stage key', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'text', title: 'Content', type: 'text', rows: 3},
    {name: 'emphasis', title: 'Emphasize cell', type: 'boolean', initialValue: false},
  ],
  preview: {
    select: {stageKey: 'stageKey', text: 'text'},
    prepare({stageKey, text}) {
      return {title: stageKey || 'Stage', subtitle: text || ''}
    },
  },
}

const processLane = {
  name: 'processLane',
  title: 'Process lane',
  type: 'object',
  fields: [
    {name: 'label', title: 'Lane label', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'description', title: 'Lane description', type: 'string'},
    {name: 'cells', title: 'Stage content', type: 'array', of: [{type: 'processCell'}]},
  ],
  preview: {select: {title: 'label', subtitle: 'description'}},
}

const processMap = {
  name: 'processMap',
  title: 'Journey / service blueprint',
  type: 'object',
  description: 'Responsive system map for user journeys, service blueprints, handoff maps, and other stage-by-lane process documentation.',
  fields: [
    {name: 'eyebrow', title: 'Eyebrow', type: 'string', initialValue: 'Process map'},
    {name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'description', title: 'Description', type: 'text', rows: 3},
    {
      name: 'mode',
      title: 'Map type',
      type: 'string',
      initialValue: 'journey',
      options: {
        list: [
          {title: 'User journey map', value: 'journey'},
          {title: 'Service blueprint', value: 'serviceBlueprint'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'stages',
      title: 'Stages',
      type: 'array',
      validation: (Rule) => Rule.required().min(2).max(10),
      of: [{type: 'processStage'}],
    },
    {
      name: 'lanes',
      title: 'Lanes',
      type: 'array',
      validation: (Rule) => Rule.required().min(2).max(10),
      of: [{type: 'processLane'}],
    },
    {name: 'note', title: 'Footer note', type: 'text', rows: 2},
    {
      name: 'theme',
      title: 'Theme',
      type: 'string',
      initialValue: 'light',
      options: {list: THEME_OPTIONS, layout: 'radio'},
    },
  ],
  preview: {
    select: {title: 'title', mode: 'mode', lanes: 'lanes'},
    prepare({title, mode, lanes}) {
      return {
        title: title || 'Process map',
        subtitle: `${mode === 'serviceBlueprint' ? 'Service blueprint' : 'User journey'} · ${lanes?.length || 0} lanes`,
      }
    },
  },
}

export const processMapTypes = [processStage, processCell, processLane, processMap]
export default processMap
