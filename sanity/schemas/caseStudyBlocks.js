const THEME_OPTIONS = [
  {title: 'Light', value: 'light'},
  {title: 'Dark artifact room', value: 'dark'},
]

function themeField(initialValue = 'light') {
  return {
    name: 'theme',
    title: 'Theme',
    type: 'string',
    initialValue,
    options: {list: THEME_OPTIONS, layout: 'radio'},
  }
}

const prototypeHotspot = {
  name: 'prototypeHotspot',
  title: 'Prototype hotspot',
  type: 'object',
  fields: [
    {name: 'label', title: 'Choice label', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'nextKey', title: 'Destination step key', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'x', title: 'X (%)', type: 'number', validation: (Rule) => Rule.required().min(0).max(100)},
    {name: 'y', title: 'Y (%)', type: 'number', validation: (Rule) => Rule.required().min(0).max(100)},
    {name: 'width', title: 'Width (%)', type: 'number', validation: (Rule) => Rule.required().greaterThan(0).max(100)},
    {name: 'height', title: 'Height (%)', type: 'number', validation: (Rule) => Rule.required().greaterThan(0).max(100)},
    {name: 'event', title: 'Umami event override (optional)', type: 'string'},
  ],
  preview: {
    select: {title: 'label', nextKey: 'nextKey'},
    prepare({title, nextKey}) {
      return {title: title || 'Hotspot', subtitle: nextKey ? `→ ${nextKey}` : 'Choose destination'}
    },
  },
}

const prototypeStep = {
  name: 'prototypeStep',
  title: 'Prototype screen',
  type: 'object',
  fields: [
    {
      name: 'stepKey',
      title: 'Step key',
      type: 'string',
      description: 'Stable routing ID used by Next step and hotspots, e.g. hub-empty, ktp-capture, hub-complete.',
      validation: (Rule) => Rule.required().regex(/^[a-z0-9][a-z0-9-]*$/, {name: 'lowercase kebab-case'}),
    },
    {name: 'label', title: 'Step label', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'caption', title: 'What this screen demonstrates', type: 'string'},
    {name: 'image', title: 'Screen image', type: 'image', options: {hotspot: false}, validation: (Rule) => Rule.required()},
    {name: 'alt', title: 'Alt text', type: 'string'},
    {name: 'annotation', title: 'Annotation / design insight', type: 'string'},
    {name: 'navNumber', title: 'Navigation number (optional)', type: 'string', description: 'e.g. 03'},
    {name: 'counter', title: 'Viewer counter (optional)', type: 'string', description: 'e.g. 03 / 07'},
    {name: 'navGroup', title: 'Navigation group (optional)', type: 'string', description: 'Use the same value for branch variants that should highlight one nav item.'},
    {name: 'showInNav', title: 'Show in navigation', type: 'boolean', initialValue: true},
    {name: 'nextKey', title: 'Next step key', type: 'string', description: 'Normal click/arrow destination. Leave empty to advance to the next array item.'},
    {name: 'isEnd', title: 'End state / restart here', type: 'boolean', initialValue: false},
    {name: 'event', title: 'Umami event override (optional)', type: 'string'},
    {
      name: 'hotspots',
      title: 'Clickable choices / hotspots',
      type: 'array',
      description: 'Optional branching choices positioned as percentages of the screen. When hotspots exist, normal next navigation is disabled until a choice is made.',
      validation: (Rule) => Rule.max(6),
      of: [{type: 'prototypeHotspot'}],
    },
  ],
  preview: {select: {title: 'label', subtitle: 'caption', media: 'image'}},
}

const interactivePrototype = {
  name: 'interactivePrototype',
  title: 'Interactive prototype',
  type: 'object',
  description: 'A clickable sequence of product states. Best for flows, branching behavior, responsive states, and before/after system behavior.',
  fields: [
    {name: 'eyebrow', title: 'Eyebrow', type: 'string', initialValue: 'Interactive prototype'},
    {name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'description', title: 'Description', type: 'text', rows: 3},
    themeField('dark'),
    {
      name: 'device',
      title: 'Device frame',
      type: 'string',
      initialValue: 'phone',
      options: {
        list: [
          {title: 'Phone', value: 'phone'},
          {title: 'Browser / desktop', value: 'browser'},
        ],
        layout: 'radio',
      },
    },
    {
      name: 'analyticsPrefix',
      title: 'Analytics prefix (optional)',
      type: 'string',
      description: 'Stable Umami prefix for this artifact, e.g. kyc_autosave. Defaults to portfolio_prototype.',
    },
    {
      name: 'steps',
      title: 'Prototype screens',
      type: 'array',
      validation: (Rule) => Rule.required().min(2).max(16),
      of: [{type: 'prototypeStep'}],
    },
  ],
  preview: {
    select: {title: 'title', subtitle: 'description'},
    prepare({title, subtitle}) {
      return {title: title || 'Interactive prototype', subtitle: subtitle || 'Clickable product flow'}
    },
  },
}

const dataSeries = {
  name: 'dataSeries',
  title: 'Data series',
  type: 'object',
  fields: [
    {name: 'key', title: 'Data key / CSV header', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'label', title: 'Display label', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'prefix', title: 'Value prefix', type: 'string', description: 'e.g. Rp, $, +'},
    {name: 'suffix', title: 'Value suffix', type: 'string', description: 'e.g. %, pp, users'},
  ],
  preview: {select: {title: 'label', subtitle: 'key'}},
}

const dataValue = {
  name: 'dataValue',
  title: 'Data value',
  type: 'object',
  fields: [
    {name: 'seriesKey', title: 'Series key', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'value', title: 'Value', type: 'number', validation: (Rule) => Rule.required()},
  ],
  preview: {
    select: {key: 'seriesKey', value: 'value'},
    prepare({key, value}) {
      return {title: key || 'Value', subtitle: value == null ? '' : String(value)}
    },
  },
}

const dataRow = {
  name: 'dataRow',
  title: 'Data row',
  type: 'object',
  fields: [
    {name: 'label', title: 'Category / date label', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'x', title: 'Numeric X (scatter only)', type: 'number'},
    {name: 'values', title: 'Values', type: 'array', of: [{type: 'dataValue'}]},
  ],
  preview: {select: {title: 'label'}},
}

const dataVisualization = {
  name: 'dataVisualization',
  title: 'Data visualization',
  type: 'object',
  description: 'Native responsive evidence chart with a written takeaway, provenance, optional baseline, hover values, and expandable data table.',
  fields: [
    {name: 'eyebrow', title: 'Eyebrow', type: 'string', initialValue: 'Evidence'},
    {name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'description', title: 'Question / context', type: 'text', rows: 2},
    {name: 'takeaway', title: 'Takeaway', type: 'text', rows: 3, description: 'What should the reader conclude from this chart?'},
    {
      name: 'chartType',
      title: 'Chart type',
      type: 'string',
      initialValue: 'line',
      validation: (Rule) => Rule.required(),
      options: {
        list: [
          {title: 'Trend / line', value: 'line'},
          {title: 'Comparison / bar', value: 'bar'},
          {title: 'Correlation / scatter', value: 'scatter'},
          {title: 'Funnel', value: 'funnel'},
          {title: 'Composition / stacked', value: 'composition'},
        ],
      },
    },
    {
      name: 'dataSource',
      title: 'Data source',
      type: 'string',
      initialValue: 'manual',
      options: {
        list: [
          {title: 'Enter data in Sanity', value: 'manual'},
          {title: 'Upload CSV', value: 'csv'},
        ],
        layout: 'radio',
      },
    },
    {
      name: 'csvFile',
      title: 'CSV file',
      type: 'file',
      options: {accept: '.csv,text/csv'},
      hidden: ({parent}) => parent?.dataSource !== 'csv',
      description: 'Configure X column and matching Series keys using the CSV headers.',
    },
    {
      name: 'xColumn',
      title: 'X column / category header',
      type: 'string',
      hidden: ({parent}) => parent?.dataSource !== 'csv',
    },
    {name: 'xLabel', title: 'X-axis label', type: 'string'},
    {name: 'yLabel', title: 'Y-axis label', type: 'string'},
    {
      name: 'series',
      title: 'Series',
      type: 'array',
      validation: (Rule) => Rule.required().min(1).max(4),
      of: [{type: 'dataSeries'}],
    },
    {
      name: 'rows',
      title: 'Manual data rows',
      type: 'array',
      hidden: ({parent}) => parent?.dataSource === 'csv',
      validation: (Rule) => Rule.max(100),
      of: [{type: 'dataRow'}],
    },
    {name: 'baseline', title: 'Reference / baseline value', type: 'number'},
    {name: 'baselineLabel', title: 'Baseline label', type: 'string'},
    {
      name: 'evidenceStatus',
      title: 'Evidence status',
      type: 'string',
      options: {
        list: [
          {title: 'Measured', value: 'measured'},
          {title: 'Experiment', value: 'experiment'},
          {title: 'Derived', value: 'derived'},
          {title: 'Estimated', value: 'estimated'},
          {title: 'Illustrative', value: 'illustrative'},
        ],
      },
    },
    {name: 'source', title: 'Source', type: 'string', description: 'e.g. MoEngage, Maze, task logs, survey responses'},
    {name: 'period', title: 'Period', type: 'string'},
    {name: 'sample', title: 'Sample / N', type: 'string', description: 'e.g. N=30 · 15 / condition'},
    {name: 'methodNote', title: 'Method / caveat note', type: 'text', rows: 2},
    themeField('light'),
  ],
  preview: {
    select: {title: 'title', chartType: 'chartType', evidenceStatus: 'evidenceStatus'},
    prepare({title, chartType, evidenceStatus}) {
      return {title: title || 'Data visualization', subtitle: [chartType, evidenceStatus].filter(Boolean).join(' · ') || 'Native evidence chart'}
    },
  },
}

const narrativeSection = {
  name: 'narrativeSection',
  title: 'Narrative section',
  type: 'object',
  description: 'Editorial reasoning block. Use this when a section needs stronger hierarchy than ordinary paragraphs.',
  fields: [
    {name: 'eyebrow', title: 'Eyebrow', type: 'string'},
    {name: 'title', title: 'Title', type: 'string'},
    {name: 'body', title: 'Body', type: 'array', of: [{type: 'block'}]},
    {name: 'callout', title: 'Callout / key statement', type: 'text', rows: 3},
    {
      name: 'width',
      title: 'Width',
      type: 'string',
      initialValue: 'normal',
      options: {
        list: [
          {title: 'Narrow', value: 'narrow'},
          {title: 'Normal', value: 'normal'},
          {title: 'Wide', value: 'wide'},
        ],
      },
    },
    themeField('light'),
  ],
  preview: {
    select: {title: 'title', subtitle: 'eyebrow'},
    prepare({title, subtitle}) {
      return {title: title || 'Narrative section', subtitle: subtitle || 'Editorial reasoning'}
    },
  },
}

const comparisonSide = {
  name: 'comparisonSide',
  title: 'Comparison side',
  type: 'object',
  fields: [
    {name: 'label', title: 'Label', type: 'string', description: 'e.g. Before, After, Flow A, Flow B'},
    {name: 'title', title: 'Title', type: 'string'},
    {name: 'description', title: 'Description', type: 'text', rows: 3},
    {name: 'image', title: 'Image (optional)', type: 'image', options: {hotspot: true}},
    {name: 'alt', title: 'Alt text', type: 'string'},
    {name: 'note', title: 'Small note', type: 'string'},
  ],
}

const comparison = {
  name: 'comparison',
  title: 'Comparison',
  type: 'object',
  description: 'Two-up comparison for before/after, Flow A/B, first-time/returning, state variants, or system trade-offs.',
  fields: [
    {name: 'eyebrow', title: 'Eyebrow', type: 'string', initialValue: 'Comparison'},
    {name: 'title', title: 'Title', type: 'string'},
    {name: 'description', title: 'Description', type: 'text', rows: 2},
    {name: 'left', title: 'Left / A', type: 'comparisonSide'},
    {name: 'right', title: 'Right / B', type: 'comparisonSide'},
    themeField('light'),
  ],
  preview: {
    select: {title: 'title', left: 'left.label', right: 'right.label'},
    prepare({title, left, right}) {
      return {title: title || 'Comparison', subtitle: [left, right].filter(Boolean).join(' vs ') || 'Two-up comparison'}
    },
  },
}

const evidenceMetric = {
  name: 'evidenceMetric',
  title: 'Evidence metric',
  type: 'object',
  fields: [
    {name: 'value', title: 'Value', type: 'string', description: 'e.g. +11%, −10%, N=30, 15K'},
    {name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'context', title: 'Context / comparison', type: 'string'},
    {name: 'note', title: 'Footnote', type: 'string'},
  ],
  preview: {select: {title: 'value', subtitle: 'label'}},
}

const evidenceGrid = {
  name: 'evidenceGrid',
  title: 'Evidence / metric grid',
  type: 'object',
  description: 'Large factual outcome numbers. Use this instead of forcing a chart when a headline metric is the evidence.',
  fields: [
    {name: 'eyebrow', title: 'Eyebrow', type: 'string', initialValue: 'Outcome'},
    {name: 'title', title: 'Title', type: 'string'},
    {name: 'description', title: 'Description', type: 'text', rows: 2},
    {name: 'columns', title: 'Desktop columns', type: 'number', initialValue: 3, validation: (Rule) => Rule.integer().min(2).max(4)},
    {name: 'metrics', title: 'Metrics', type: 'array', validation: (Rule) => Rule.required().min(1).max(8), of: [{type: 'evidenceMetric'}]},
    themeField('light'),
  ],
  preview: {
    select: {title: 'title', metrics: 'metrics'},
    prepare({title, metrics}) {
      return {title: title || 'Evidence grid', subtitle: `${metrics?.length || 0} metric${metrics?.length === 1 ? '' : 's'}`}
    },
  },
}

const artifactTab = {
  name: 'artifactTab',
  title: 'Artifact tab',
  type: 'object',
  fields: [
    {name: 'label', title: 'Tab label', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'title', title: 'Panel title', type: 'string'},
    {name: 'description', title: 'Panel description', type: 'text', rows: 2},
    {
      name: 'kind',
      title: 'Artifact type',
      type: 'string',
      initialValue: 'image',
      validation: (Rule) => Rule.required(),
      options: {
        list: [
          {title: 'Image / final UI', value: 'image'},
          {title: 'Interactive prototype', value: 'prototype'},
          {title: 'Data visualization', value: 'data'},
        ],
        layout: 'radio',
      },
    },
    {name: 'image', title: 'Image', type: 'image', options: {hotspot: true}, hidden: ({parent}) => parent?.kind !== 'image'},
    {name: 'alt', title: 'Alt text', type: 'string', hidden: ({parent}) => parent?.kind !== 'image'},
    {name: 'caption', title: 'Caption', type: 'string', hidden: ({parent}) => parent?.kind !== 'image'},
    {name: 'prototype', title: 'Interactive prototype', type: 'interactivePrototype', hidden: ({parent}) => parent?.kind !== 'prototype'},
    {name: 'dataViz', title: 'Data visualization', type: 'dataVisualization', hidden: ({parent}) => parent?.kind !== 'data'},
  ],
  preview: {
    select: {title: 'label', kind: 'kind', media: 'image'},
    prepare({title, kind, media}) {
      return {title: title || 'Artifact tab', subtitle: kind || 'artifact', media}
    },
  },
}

const artifactExplorer = {
  name: 'artifactExplorer',
  title: 'Artifact explorer / tabs',
  type: 'object',
  description: 'Progressive disclosure for parallel scenarios or evidence views. Tabs can contain an image, interactive prototype, or DataViz.',
  fields: [
    {name: 'eyebrow', title: 'Eyebrow', type: 'string', initialValue: 'Artifact explorer'},
    {name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required()},
    {name: 'description', title: 'Description', type: 'text', rows: 3},
    themeField('light'),
    {name: 'tabs', title: 'Tabs', type: 'array', validation: (Rule) => Rule.required().min(2).max(6), of: [{type: 'artifactTab'}]},
  ],
  preview: {
    select: {title: 'title', tabs: 'tabs'},
    prepare({title, tabs}) {
      return {title: title || 'Artifact explorer', subtitle: `${tabs?.length || 0} tabs · image / prototype / data`}
    },
  },
}

export const caseStudyBlockTypes = [
  prototypeHotspot,
  prototypeStep,
  interactivePrototype,
  dataSeries,
  dataValue,
  dataRow,
  dataVisualization,
  narrativeSection,
  comparisonSide,
  comparison,
  evidenceMetric,
  evidenceGrid,
  artifactTab,
  artifactExplorer,
]
