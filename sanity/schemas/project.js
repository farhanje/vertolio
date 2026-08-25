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
  { title: '16:10', value: '16:10' },
  { title: '3:2', value: '3:2' },
  { title: '4:3', value: '4:3' },
  { title: '1:1', value: '1:1' },
]

const MEDIA_WIDTH = [
  { title: 'Text width', value: 'text' },
  { title: 'Wide', value: 'wide' },
]

const THEME_OPTIONS = [
  { title: 'Light', value: 'light' },
  { title: 'Dark artifact room', value: 'dark' },
]

const EN_FALLBACK_NOTE = 'Optional native English. Leave empty to keep the current Google Translate fallback until the English portfolio copy is revised.'

function themeField(initialValue = 'light') {
  return {
    name: 'theme',
    title: 'Theme',
    type: 'string',
    initialValue,
    options: { list: THEME_OPTIONS, layout: 'radio' },
  }
}

function interactivePrototypeObject(name = 'interactivePrototype', title = 'Interactive prototype', hidden) {
  return {
    name,
    title,
    type: 'object',
    hidden,
    description: 'A clickable sequence of product states. Best for flows, branching behavior, responsive states, and before/after system behavior.',
    fields: [
      { name: 'eyebrow', title: 'Eyebrow', type: 'string', initialValue: 'Interactive prototype' },
      { name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() },
      { name: 'description', title: 'Description', type: 'text', rows: 3 },
      themeField('dark'),
      {
        name: 'device',
        title: 'Device frame',
        type: 'string',
        initialValue: 'phone',
        options: {
          list: [
            { title: 'Phone', value: 'phone' },
            { title: 'Browser / desktop', value: 'browser' },
          ],
          layout: 'radio',
        },
      },
      {
        name: 'steps',
        title: 'Prototype screens',
        type: 'array',
        validation: (Rule) => Rule.required().min(2).max(16),
        of: [
          {
            type: 'object',
            title: 'Screen',
            fields: [
              { name: 'label', title: 'Step label', type: 'string', validation: (Rule) => Rule.required() },
              { name: 'caption', title: 'What this screen demonstrates', type: 'string' },
              { name: 'image', title: 'Screen image', type: 'image', options: { hotspot: false }, validation: (Rule) => Rule.required() },
              { name: 'alt', title: 'Alt text', type: 'string' },
            ],
            preview: { select: { title: 'label', subtitle: 'caption', media: 'image' } },
          },
        ],
      },
    ],
    preview: {
      select: { title: 'title', subtitle: 'description' },
      prepare({title: previewTitle, subtitle}) {
        return { title: previewTitle || 'Interactive prototype', subtitle: subtitle || 'Clickable product flow' }
      },
    },
  }
}

function dataVisualizationObject(name = 'dataVisualization', title = 'Data visualization', hidden) {
  return {
    name,
    title,
    type: 'object',
    hidden,
    description: 'Native responsive evidence chart with a written takeaway, provenance, optional baseline, hover values, and expandable data table.',
    fields: [
      { name: 'eyebrow', title: 'Eyebrow', type: 'string', initialValue: 'Evidence' },
      { name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() },
      { name: 'description', title: 'Question / context', type: 'text', rows: 2 },
      { name: 'takeaway', title: 'Takeaway', type: 'text', rows: 3, description: 'Required thinking layer: what should the reader conclude from this chart?' },
      {
        name: 'chartType',
        title: 'Chart type',
        type: 'string',
        initialValue: 'line',
        validation: (Rule) => Rule.required(),
        options: {
          list: [
            { title: 'Trend / line', value: 'line' },
            { title: 'Comparison / bar', value: 'bar' },
            { title: 'Correlation / scatter', value: 'scatter' },
            { title: 'Funnel', value: 'funnel' },
            { title: 'Composition / stacked', value: 'composition' },
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
            { title: 'Enter data in Sanity', value: 'manual' },
            { title: 'Upload CSV', value: 'csv' },
          ],
          layout: 'radio',
        },
      },
      {
        name: 'csvFile',
        title: 'CSV file',
        type: 'file',
        options: { accept: '.csv,text/csv' },
        hidden: ({parent}) => parent?.dataSource !== 'csv',
        description: 'First column can be the x/category field. Configure the exact header in X column and use matching Series keys for value columns.',
      },
      {
        name: 'xColumn',
        title: 'X column / category header',
        type: 'string',
        hidden: ({parent}) => parent?.dataSource !== 'csv',
        description: 'CSV header used for the horizontal/category dimension, e.g. date, month, variant, or users.',
      },
      { name: 'xLabel', title: 'X-axis label', type: 'string' },
      { name: 'yLabel', title: 'Y-axis label', type: 'string' },
      {
        name: 'series',
        title: 'Series',
        type: 'array',
        validation: (Rule) => Rule.required().min(1).max(4),
        of: [
          {
            type: 'object',
            fields: [
              { name: 'key', title: 'Data key / CSV header', type: 'string', validation: (Rule) => Rule.required() },
              { name: 'label', title: 'Display label', type: 'string', validation: (Rule) => Rule.required() },
              { name: 'prefix', title: 'Value prefix', type: 'string', description: 'e.g. Rp, $, +' },
              { name: 'suffix', title: 'Value suffix', type: 'string', description: 'e.g. %, pp, users' },
            ],
            preview: { select: { title: 'label', subtitle: 'key' } },
          },
        ],
      },
      {
        name: 'rows',
        title: 'Manual data rows',
        type: 'array',
        hidden: ({parent}) => parent?.dataSource === 'csv',
        validation: (Rule) => Rule.max(100),
        of: [
          {
            type: 'object',
            fields: [
              { name: 'label', title: 'Category / date label', type: 'string', validation: (Rule) => Rule.required() },
              { name: 'x', title: 'Numeric X (scatter only)', type: 'number' },
              {
                name: 'values',
                title: 'Values',
                type: 'array',
                of: [
                  {
                    type: 'object',
                    fields: [
                      { name: 'seriesKey', title: 'Series key', type: 'string', validation: (Rule) => Rule.required() },
                      { name: 'value', title: 'Value', type: 'number', validation: (Rule) => Rule.required() },
                    ],
                    preview: {
                      select: { key: 'seriesKey', value: 'value' },
                      prepare({key, value}) { return { title: key || 'Value', subtitle: value == null ? '' : String(value) } },
                    },
                  },
                ],
              },
            ],
            preview: { select: { title: 'label' } },
          },
        ],
      },
      { name: 'baseline', title: 'Reference / baseline value', type: 'number' },
      { name: 'baselineLabel', title: 'Baseline label', type: 'string' },
      {
        name: 'evidenceStatus',
        title: 'Evidence status',
        type: 'string',
        options: {
          list: [
            { title: 'Measured', value: 'measured' },
            { title: 'Experiment', value: 'experiment' },
            { title: 'Derived', value: 'derived' },
            { title: 'Estimated', value: 'estimated' },
            { title: 'Illustrative', value: 'illustrative' },
          ],
        },
      },
      { name: 'source', title: 'Source', type: 'string', description: 'e.g. MoEngage, Maze, task logs, survey responses' },
      { name: 'period', title: 'Period', type: 'string' },
      { name: 'sample', title: 'Sample / N', type: 'string', description: 'e.g. N=30 · 15 / condition' },
      { name: 'methodNote', title: 'Method / caveat note', type: 'text', rows: 2, description: 'Use this for statistical significance, correlation caveats, derived calculations, or other boundaries.' },
      themeField('light'),
    ],
    preview: {
      select: { title: 'title', chartType: 'chartType', evidenceStatus: 'evidenceStatus' },
      prepare({title: previewTitle, chartType, evidenceStatus}) {
        return { title: previewTitle || 'Data visualization', subtitle: [chartType, evidenceStatus].filter(Boolean).join(' · ') || 'Native evidence chart' }
      },
    },
  }
}

function narrativeSectionObject() {
  return {
    name: 'narrativeSection',
    title: 'Narrative section',
    type: 'object',
    description: 'Editorial reasoning block. Use this when a section needs stronger hierarchy than ordinary paragraphs.',
    fields: [
      { name: 'eyebrow', title: 'Eyebrow', type: 'string' },
      { name: 'title', title: 'Title', type: 'string' },
      { name: 'body', title: 'Body', type: 'array', of: [{ type: 'block' }] },
      { name: 'callout', title: 'Callout / key statement', type: 'text', rows: 3 },
      {
        name: 'width',
        title: 'Width',
        type: 'string',
        initialValue: 'normal',
        options: { list: [
          { title: 'Narrow', value: 'narrow' },
          { title: 'Normal', value: 'normal' },
          { title: 'Wide', value: 'wide' },
        ] },
      },
      themeField('light'),
    ],
    preview: {
      select: { title: 'title', subtitle: 'eyebrow' },
      prepare({title: previewTitle, subtitle}) { return { title: previewTitle || 'Narrative section', subtitle: subtitle || 'Editorial reasoning' } },
    },
  }
}

function comparisonObject() {
  const side = (name, title) => ({
    name,
    title,
    type: 'object',
    fields: [
      { name: 'label', title: 'Label', type: 'string', description: 'e.g. Before, After, Flow A, Flow B' },
      { name: 'title', title: 'Title', type: 'string' },
      { name: 'description', title: 'Description', type: 'text', rows: 3 },
      { name: 'image', title: 'Image (optional)', type: 'image', options: { hotspot: true } },
      { name: 'alt', title: 'Alt text', type: 'string' },
      { name: 'note', title: 'Small note', type: 'string' },
    ],
  })

  return {
    name: 'comparison',
    title: 'Comparison',
    type: 'object',
    description: 'Two-up comparison for before/after, Flow A/B, first-time/returning, state variants, or system trade-offs.',
    fields: [
      { name: 'eyebrow', title: 'Eyebrow', type: 'string', initialValue: 'Comparison' },
      { name: 'title', title: 'Title', type: 'string' },
      { name: 'description', title: 'Description', type: 'text', rows: 2 },
      side('left', 'Left / A'),
      side('right', 'Right / B'),
      themeField('light'),
    ],
    preview: {
      select: { title: 'title', left: 'left.label', right: 'right.label' },
      prepare({title: previewTitle, left, right}) { return { title: previewTitle || 'Comparison', subtitle: [left, right].filter(Boolean).join(' vs ') || 'Two-up comparison' } },
    },
  }
}

function evidenceGridObject() {
  return {
    name: 'evidenceGrid',
    title: 'Evidence / metric grid',
    type: 'object',
    description: 'Large factual outcome numbers. Use this instead of forcing a chart when a headline metric is the evidence.',
    fields: [
      { name: 'eyebrow', title: 'Eyebrow', type: 'string', initialValue: 'Outcome' },
      { name: 'title', title: 'Title', type: 'string' },
      { name: 'description', title: 'Description', type: 'text', rows: 2 },
      {
        name: 'columns',
        title: 'Desktop columns',
        type: 'number',
        initialValue: 3,
        validation: (Rule) => Rule.integer().min(2).max(4),
      },
      {
        name: 'metrics',
        title: 'Metrics',
        type: 'array',
        validation: (Rule) => Rule.required().min(1).max(8),
        of: [
          {
            type: 'object',
            fields: [
              { name: 'value', title: 'Value', type: 'string', description: 'e.g. +11%, −10%, N=30, 15K' },
              { name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() },
              { name: 'context', title: 'Context / comparison', type: 'string' },
              { name: 'note', title: 'Footnote', type: 'string' },
            ],
            preview: { select: { title: 'value', subtitle: 'label' } },
          },
        ],
      },
      themeField('light'),
    ],
    preview: {
      select: { title: 'title', metrics: 'metrics' },
      prepare({title: previewTitle, metrics}) { return { title: previewTitle || 'Evidence grid', subtitle: `${metrics?.length || 0} metric${metrics?.length === 1 ? '' : 's'}` } },
    },
  }
}

function artifactExplorerObject() {
  return {
    name: 'artifactExplorer',
    title: 'Artifact explorer / tabs',
    type: 'object',
    description: 'Progressive disclosure for parallel scenarios or evidence views. Tabs can contain an image, interactive prototype, or DataViz.',
    fields: [
      { name: 'eyebrow', title: 'Eyebrow', type: 'string', initialValue: 'Artifact explorer' },
      { name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() },
      { name: 'description', title: 'Description', type: 'text', rows: 3 },
      themeField('light'),
      {
        name: 'tabs',
        title: 'Tabs',
        type: 'array',
        validation: (Rule) => Rule.required().min(2).max(6),
        of: [
          {
            type: 'object',
            fields: [
              { name: 'label', title: 'Tab label', type: 'string', validation: (Rule) => Rule.required() },
              { name: 'title', title: 'Panel title', type: 'string' },
              { name: 'description', title: 'Panel description', type: 'text', rows: 2 },
              {
                name: 'kind',
                title: 'Artifact type',
                type: 'string',
                initialValue: 'image',
                validation: (Rule) => Rule.required(),
                options: {
                  list: [
                    { title: 'Image / final UI', value: 'image' },
                    { title: 'Interactive prototype', value: 'prototype' },
                    { title: 'Data visualization', value: 'data' },
                  ],
                  layout: 'radio',
                },
              },
              { name: 'image', title: 'Image', type: 'image', options: { hotspot: true }, hidden: ({parent}) => parent?.kind !== 'image' },
              { name: 'alt', title: 'Alt text', type: 'string', hidden: ({parent}) => parent?.kind !== 'image' },
              { name: 'caption', title: 'Caption', type: 'string', hidden: ({parent}) => parent?.kind !== 'image' },
              interactivePrototypeObject('prototype', 'Interactive prototype', ({parent}) => parent?.kind !== 'prototype'),
              dataVisualizationObject('dataViz', 'Data visualization', ({parent}) => parent?.kind !== 'data'),
            ],
            preview: {
              select: { title: 'label', kind: 'kind', media: 'image' },
              prepare({title: previewTitle, kind, media}) { return { title: previewTitle || 'Artifact tab', subtitle: kind || 'artifact', media } },
            },
          },
        ],
      },
    ],
    preview: {
      select: { title: 'title', tabs: 'tabs' },
      prepare({title: previewTitle, tabs}) { return { title: previewTitle || 'Artifact explorer', subtitle: `${tabs?.length || 0} tabs · image / prototype / data` } },
    },
  }
}

function bodyBlocks() {
  return [
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
    narrativeSectionObject(),
    interactivePrototypeObject(),
    artifactExplorerObject(),
    comparisonObject(),
    dataVisualizationObject(),
    evidenceGridObject(),
  ]
}

export default {
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title — Indonesian', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'titleEn', title: 'Title — English', type: 'string', description: EN_FALLBACK_NOTE },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', maxLength: 96 }, validation: (Rule) => Rule.required() },
    { name: 'organization', title: 'Organization', type: 'reference', to: [{ type: 'organization' }], validation: (Rule) => Rule.required() },
    { name: 'date', title: 'Date', type: 'datetime' },
    { name: 'summary', title: 'Summary — Indonesian', type: 'text', rows: 3 },
    { name: 'summaryEn', title: 'Summary — English', type: 'text', rows: 3, description: EN_FALLBACK_NOTE },
    { name: 'tags', title: 'Tags — Indonesian', type: 'array', of: [{ type: 'string' }] },
    { name: 'tagsEn', title: 'Tags — English', type: 'array', of: [{ type: 'string' }], description: EN_FALLBACK_NOTE },
    { name: 'featured', title: 'Show on Home (Featured)', type: 'boolean', initialValue: false },
    {
      name: 'workOrder',
      title: 'Work index order (optional)',
      type: 'number',
      description: 'Lower numbers appear first inside the organization on /work. Leave blank to fall back to the project date. Use 1 for the flagship project you want shown first.',
      validation: (Rule) => Rule.integer().min(1),
    },
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
        { name: 'alt', title: 'Alt text — Indonesian', type: 'string' },
        { name: 'altEn', title: 'Alt text — English', type: 'string', description: EN_FALLBACK_NOTE },
        { name: 'ratio', title: 'Card ratio', type: 'string', options: { list: CARD_RATIO }, initialValue: '3:2' },
      ],
      description: 'Shown on project cards. New editorial listings use a consistent 3:2 frame; the stored ratio remains useful elsewhere.',
    },
    {
      name: 'cardStat',
      title: 'Card outcome / proof point (optional)',
      type: 'object',
      description: 'One concise proof point for index cards, e.g. “+11%” / “peak KYC uplift”. Keep it factual and short.',
      fields: [
        { name: 'value', title: 'Value', type: 'string', description: 'Examples: +11%, −10%, 9.3%, 15K' },
        { name: 'label', title: 'Label — Indonesian', type: 'string' },
        { name: 'labelEn', title: 'Label — English', type: 'string', description: EN_FALLBACK_NOTE },
      ],
    },
    { name: 'role', title: 'Role — Indonesian', type: 'string' },
    { name: 'roleEn', title: 'Role — English', type: 'string', description: EN_FALLBACK_NOTE },
    { name: 'timeline', title: 'Timeline — Indonesian', type: 'string' },
    { name: 'timelineEn', title: 'Timeline — English', type: 'string', description: EN_FALLBACK_NOTE },
    { name: 'tools', title: 'Tools', type: 'array', of: [{ type: 'string' }] },
    {
      name: 'body',
      title: 'Case Study Body — Indonesian',
      type: 'array',
      of: bodyBlocks(),
    },
    {
      name: 'bodyEn',
      title: 'Case Study Body — English',
      type: 'array',
      of: bodyBlocks(),
      description: EN_FALLBACK_NOTE,
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'organization.name', media: 'cardImage' },
  },
}
