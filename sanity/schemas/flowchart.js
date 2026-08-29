const THEME_OPTIONS = [
  {title: 'Light', value: 'light'},
  {title: 'Dark artifact room', value: 'dark'},
]

const NODE_KIND_OPTIONS = [
  {title: 'Start', value: 'start'},
  {title: 'Process', value: 'process'},
  {title: 'Decision', value: 'decision'},
  {title: 'System / backstage', value: 'system'},
  {title: 'End', value: 'end'},
]

const flowchartLane = {
  name: 'flowchartLane',
  title: 'Flowchart lane',
  type: 'object',
  fields: [
    {
      name: 'key',
      title: 'Lane key',
      type: 'string',
      description: 'Stable lowercase key used by nodes, for example user, ui, client-state, backend.',
      validation: (Rule) => Rule.required().regex(/^[a-z0-9][a-z0-9-]*$/, {name: 'lowercase kebab-case'}),
    },
    {name: 'label', title: 'Lane label', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'description', title: 'Lane description', type: 'string'},
  ],
  preview: {select: {title: 'label', subtitle: 'key'}},
}

const flowchartNode = {
  name: 'flowchartNode',
  title: 'Flowchart node',
  type: 'object',
  fields: [
    {
      name: 'key',
      title: 'Node key',
      type: 'string',
      description: 'Stable ID referenced by connectors, for example review-hub or persist-task.',
      validation: (Rule) => Rule.required().regex(/^[a-z0-9][a-z0-9-]*$/, {name: 'lowercase kebab-case'}),
    },
    {name: 'label', title: 'Node label', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'description', title: 'Node description', type: 'text', rows: 2},
    {name: 'badge', title: 'Small node label', type: 'string', description: 'Optional. Use for labels such as UI, API, rule, or state.'},
    {
      name: 'kind',
      title: 'Node type',
      type: 'string',
      initialValue: 'process',
      options: {list: NODE_KIND_OPTIONS, layout: 'dropdown'},
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'laneKey',
      title: 'Lane key',
      type: 'string',
      description: 'Swimlane mode only. Must match one lane key. Ignored in Basic mode.',
    },
    {
      name: 'column',
      title: 'Stage',
      type: 'number',
      initialValue: 1,
      description: 'Main sequence position. Horizontal flows read this left-to-right. Vertical flows read it top-to-bottom.',
      validation: (Rule) => Rule.required().integer().min(1).max(12),
    },
    {
      name: 'row',
      title: 'Branch position',
      type: 'number',
      initialValue: 1,
      description: 'Basic mode only. Horizontal flows use this as the row. Vertical flows use it as the branch column. Ignored in Swimlane mode.',
      validation: (Rule) => Rule.integer().min(1).max(8),
    },
    {name: 'emphasis', title: 'Emphasize node', type: 'boolean', initialValue: false},
  ],
  preview: {
    select: {title: 'label', key: 'key', kind: 'kind', column: 'column', laneKey: 'laneKey'},
    prepare({title, key, kind, column, laneKey}) {
      return {title: title || 'Node', subtitle: [kind, laneKey, `stage ${column || 1}`, key].filter(Boolean).join(' · ')}
    },
  },
}

const flowchartEdge = {
  name: 'flowchartEdge',
  title: 'Flowchart connector',
  type: 'object',
  fields: [
    {name: 'from', title: 'From node key', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'to', title: 'To node key', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'label', title: 'Connector label', type: 'string', description: 'Optional short label such as yes, no, saved, retry, or submit.'},
    {
      name: 'style',
      title: 'Line style',
      type: 'string',
      initialValue: 'solid',
      options: {
        list: [
          {title: 'Solid', value: 'solid'},
          {title: 'Dashed', value: 'dashed'},
        ],
        layout: 'radio',
      },
    },
    {name: 'emphasis', title: 'Emphasize connector', type: 'boolean', initialValue: false},
  ],
  preview: {
    select: {from: 'from', to: 'to', label: 'label'},
    prepare({from, to, label}) {
      return {title: `${from || '?'} → ${to || '?'}`, subtitle: label || ''}
    },
  },
}

const flowchart = {
  name: 'flowchart',
  title: 'Native flowchart',
  type: 'object',
  description: 'Responsive flow diagram for product flows, system behavior, decision trees, handoffs, and swimlanes. Author by sequence and branch position instead of manual x/y coordinates.',
  fields: [
    {name: 'eyebrow', title: 'Eyebrow', type: 'string', initialValue: 'Flowchart'},
    {name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'description', title: 'Description', type: 'text', rows: 3},
    {
      name: 'mode',
      title: 'Flow layout',
      type: 'string',
      initialValue: 'basic',
      options: {
        list: [
          {title: 'Basic flow', value: 'basic'},
          {title: 'Swimlane flow', value: 'swimlane'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'direction',
      title: 'Flow direction',
      type: 'string',
      initialValue: 'horizontal',
      description: 'Horizontal is best for short journeys and state models. Vertical works well for long sequences, approval chains, onboarding, and operational handoffs.',
      options: {
        list: [
          {title: 'Horizontal · left to right', value: 'horizontal'},
          {title: 'Vertical · top to bottom', value: 'vertical'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'lanes',
      title: 'Swimlanes',
      type: 'array',
      description: 'Only used in Swimlane mode. Horizontal flow shows lanes top-to-bottom. Vertical flow shows lanes left-to-right.',
      hidden: ({parent}) => parent?.mode !== 'swimlane',
      validation: (Rule) => Rule.max(8),
      of: [{type: 'flowchartLane'}],
    },
    {
      name: 'nodes',
      title: 'Nodes',
      type: 'array',
      description: 'Stage controls the main sequence. In Basic mode use Branch position for parallel paths. In Swimlane mode use laneKey.',
      validation: (Rule) => Rule.required().min(2).max(24),
      of: [{type: 'flowchartNode'}],
    },
    {
      name: 'edges',
      title: 'Connectors',
      type: 'array',
      description: 'Connect node keys. Lines and arrowheads are drawn automatically on the website.',
      validation: (Rule) => Rule.max(40),
      of: [{type: 'flowchartEdge'}],
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
    select: {title: 'title', mode: 'mode', direction: 'direction', nodes: 'nodes', lanes: 'lanes'},
    prepare({title, mode, direction, nodes, lanes}) {
      const laneText = mode === 'swimlane' ? ` · ${lanes?.length || 0} lanes` : ''
      const directionText = direction === 'vertical' ? 'Vertical' : 'Horizontal'
      return {title: title || 'Flowchart', subtitle: `${mode === 'swimlane' ? 'Swimlane' : 'Basic'} · ${directionText} · ${nodes?.length || 0} nodes${laneText}`}
    },
  },
}

export const flowchartTypes = [flowchartLane, flowchartNode, flowchartEdge, flowchart]
export default flowchart
