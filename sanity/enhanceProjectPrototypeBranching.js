function hasField(node, name) {
  return Array.isArray(node?.fields) && node.fields.some((field) => field?.name === name)
}

function stepRoutingFields() {
  return [
    {
      name: 'stepKey',
      title: 'Step key',
      type: 'string',
      description: 'Stable routing ID used by Next step and hotspots, e.g. hub-empty, ktp-capture, hub-complete.',
      validation: (Rule) => Rule.required().regex(/^[a-z0-9][a-z0-9-]*$/, {name: 'lowercase kebab-case'}),
    },
    { name: 'annotation', title: 'Annotation / design insight', type: 'string' },
    { name: 'navNumber', title: 'Navigation number (optional)', type: 'string', description: 'e.g. 03' },
    { name: 'counter', title: 'Viewer counter (optional)', type: 'string', description: 'e.g. 03 / 07' },
    { name: 'navGroup', title: 'Navigation group (optional)', type: 'string', description: 'Use the same value for branch variants that should highlight one nav item.' },
    { name: 'showInNav', title: 'Show in navigation', type: 'boolean', initialValue: true },
    { name: 'nextKey', title: 'Next step key', type: 'string', description: 'Normal click/arrow destination. Leave empty to advance to the next array item.' },
    { name: 'isEnd', title: 'End state / restart here', type: 'boolean', initialValue: false },
    { name: 'event', title: 'Umami event override (optional)', type: 'string' },
    {
      name: 'hotspots',
      title: 'Clickable choices / hotspots',
      type: 'array',
      description: 'Optional branching choices positioned as percentages of the screen. When hotspots exist, normal next navigation is disabled until a choice is made.',
      validation: (Rule) => Rule.max(6),
      of: [
        {
          type: 'object',
          fields: [
            { name: 'label', title: 'Choice label', type: 'string', validation: (Rule) => Rule.required() },
            { name: 'nextKey', title: 'Destination step key', type: 'string', validation: (Rule) => Rule.required() },
            { name: 'x', title: 'X (%)', type: 'number', validation: (Rule) => Rule.required().min(0).max(100) },
            { name: 'y', title: 'Y (%)', type: 'number', validation: (Rule) => Rule.required().min(0).max(100) },
            { name: 'width', title: 'Width (%)', type: 'number', validation: (Rule) => Rule.required().greaterThan(0).max(100) },
            { name: 'height', title: 'Height (%)', type: 'number', validation: (Rule) => Rule.required().greaterThan(0).max(100) },
            { name: 'event', title: 'Umami event override (optional)', type: 'string' },
          ],
          preview: {
            select: {title: 'label', nextKey: 'nextKey'},
            prepare({title, nextKey}) {
              return {title: title || 'Hotspot', subtitle: nextKey ? `→ ${nextKey}` : 'Choose destination'}
            },
          },
        },
      ],
    },
  ]
}

function enhancePrototype(node) {
  if (!hasField(node, 'analyticsPrefix')) {
    node.fields.push({
      name: 'analyticsPrefix',
      title: 'Analytics prefix (optional)',
      type: 'string',
      description: 'Stable Umami prefix for this artifact, e.g. kyc_autosave. Defaults to portfolio_prototype.',
    })
  }

  const steps = node.fields.find((field) => field?.name === 'steps')
  const stepObject = steps?.of?.find((item) => item?.type === 'object')
  if (!stepObject) return
  if (!Array.isArray(stepObject.fields)) stepObject.fields = []

  for (const field of stepRoutingFields()) {
    if (!stepObject.fields.some((existing) => existing?.name === field.name)) {
      stepObject.fields.push(field)
    }
  }
}

function walk(node) {
  if (!node || typeof node !== 'object') return

  const isPrototype = node.type === 'object' && hasField(node, 'steps') && hasField(node, 'device')
  if (isPrototype) enhancePrototype(node)

  if (Array.isArray(node.fields)) node.fields.forEach(walk)
  if (Array.isArray(node.of)) node.of.forEach(walk)
}

export default function enhanceProjectPrototypeBranching(schema) {
  walk(schema)
  return schema
}
