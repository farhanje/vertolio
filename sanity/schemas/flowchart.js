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
      title: 'Column',
      type: 'number',
      initialValue: 1,
      description: 'Left-to-right stage position. Start at 1. Put parallel branches in the same column.',
      validation: (Rule) => Rule.required().integer().min(1).max(12),
    },
    {
      name: 'row',
      title: 'Row',
      type: 'number',
      initialValue: 1,
      description: 'Basic mode only. Use row 1 for the main path and other rows for branches. Ignored in Swimlane mode.',
      validation: (Rule) => Rule.integer().min(1).max(8),
    },
    {name: 'emphasis', title: 'Emphasize node', type: 'boolean', initialValue: false},
  ],
  preview: {
    select: {title: 'label', key: 'key', kind: 'kind', column: 'column', laneKey: 'laneKey'},
    prepare({title, key, kind, column, laneKey}) {
      return {title: title || 'Node', subtitle: [kind, laneKey, `col ${column || 1}`, key].filter(Boolean).join(' · ')}
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
  description: 'Responsive flow diagram for product flows, system behavior, decision trees, handoffs, and swimlanes. Author with columns and rows or lane keys instead of manual x/y positioning.',
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
      name: 'lanes',
      title: 'Swimlanes',
      type: 'array',
      description: 'Only used in Swimlane mode. Order here controls top-to-bottom lane order.',
      hidden: ({parent}) => parent?.mode !== 'swimlane',
      validation: (Rule) => Rule.max(8),
      of: [{type: 'flowchartLane'}],
    },
    {
      name: 'nodes',
      title: 'Nodes',
      type: 'array',
      description: 'Place nodes by column. In Basic mode use row for branches. In Swimlane mode use laneKey.',
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
    select: {title: 'title', mode: 'mode', nodes: 'nodes', lanes: 'lanes'},
    prepare({title, mode, nodes, lanes}) {
      const laneText = mode === 'swimlane' ? ` · ${lanes?.length || 0} lanes` : ''
      return {title: title || 'Flowchart', subtitle: `${mode === 'swimlane' ? 'Swimlane' : 'Basic'} · ${nodes?.length || 0} nodes${laneText}`}
    },
  },
}

export const flowchartTypes = [flowchartLane, flowchartNode, flowchartEdge, flowchart]
export default flowchart
