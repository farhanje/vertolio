const PROTOTYPE_PRESETS = [
  {title: 'KYC Autosave Flow B · Indonesian', value: 'kyc-autosave-flow-b-id'},
  {title: 'KYC Autosave Flow B · English', value: 'kyc-autosave-flow-b-en'},
  {title: 'QRIS Top Up · Indonesian', value: 'qris-top-up-flow-id'},
  {title: 'QRIS Top Up · English', value: 'qris-top-up-flow-en'},
  {title: 'KYB AI Pre-check · Indonesian', value: 'kyb-ai-precheck-flow-id'},
  {title: 'KYB AI Pre-check · English', value: 'kyb-ai-precheck-flow-en'},
  {title: 'KYC OCR Vertex AI · Indonesian', value: 'kyc-ocr-vertex-ai-flow-id'},
  {title: 'KYC OCR Vertex AI · English', value: 'kyc-ocr-vertex-ai-flow-en'},
]

function augmentInteractivePrototype(type) {
  const fields = type.fields.flatMap((field) => {
    if (field.name === 'analyticsPrefix') {
      return [
        {
          name: 'anchorId',
          title: 'Anchor ID (optional)',
          type: 'string',
          description: 'In-page link target without #, e.g. interactive-flow-b.',
          validation: (Rule) => Rule.regex(/^[a-z0-9][a-z0-9-]*$/, {name: 'lowercase kebab-case'}),
        },
        {
          name: 'preset',
          title: 'Prototype preset (optional)',
          type: 'string',
          description: 'Use a reusable built-in prototype. Uploaded screens below override the preset when provided.',
          options: {list: PROTOTYPE_PRESETS},
        },
        field,
      ]
    }

    if (field.name === 'steps') {
      return [{
        ...field,
        description: 'Add at least 2 uploaded screens, or choose a Prototype preset above.',
        validation: (Rule) => Rule.max(16).custom((steps, context) => {
          if (context?.parent?.preset) return true
          return Array.isArray(steps) && steps.length >= 2 ? true : 'Add at least 2 screens or choose a Prototype preset.'
        }),
      }]
    }

    return [field]
  })

  return {...type, fields}
}

function augmentComparisonSide(type) {
  return {
    ...type,
    fields: [
      ...type.fields,
      {name: 'linkLabel', title: 'Link label (optional)', type: 'string', description: 'e.g. Try the interactive flow'},
      {name: 'linkHref', title: 'Link target (optional)', type: 'string', description: 'Use an in-page anchor such as #interactive-flow-b or a full URL.'},
    ],
  }
}

function augmentArtifactExplorer(type) {
  const fields = type.fields.flatMap((field) => {
    if (field.name !== 'theme') return [field]
    return [
      {
        name: 'layout',
        title: 'Tab layout',
        type: 'string',
        initialValue: 'horizontal',
        description: 'Horizontal works well for short labels and quick comparison. Vertical creates a left-side index for longer labels or several related artifacts.',
        options: {
          list: [
            {title: 'Horizontal tabs', value: 'horizontal'},
            {title: 'Vertical tabs', value: 'vertical'},
          ],
          layout: 'radio',
        },
        validation: (Rule) => Rule.required(),
      },
      field,
    ]
  })

  return {...type, fields}
}

export default function augmentCaseStudyBlockTypes(types = []) {
  return types.map((type) => {
    if (type?.name === 'interactivePrototype') return augmentInteractivePrototype(type)
    if (type?.name === 'comparisonSide') return augmentComparisonSide(type)
    if (type?.name === 'artifactExplorer') return augmentArtifactExplorer(type)
    return type
  })
}
