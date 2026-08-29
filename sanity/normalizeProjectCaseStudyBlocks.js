const CASE_STUDY_BLOCK_TYPES = new Set([
  'narrativeSection',
  'interactivePrototype',
  'artifactExplorer',
  'comparison',
  'dataVisualization',
  'evidenceGrid',
  'processMap',
  'flowchart',
])

function normalizeBodyField(field) {
  if (!Array.isArray(field?.of)) return field

  const normalized = field.of.map((member) => {
    if (member?.type === 'object' && CASE_STUDY_BLOCK_TYPES.has(member?.name)) {
      return {type: member.name}
    }
    return member
  })

  if (!normalized.some((member) => member?.type === 'processMap')) {
    normalized.push({type: 'processMap'})
  }
  if (!normalized.some((member) => member?.type === 'flowchart')) {
    normalized.push({type: 'flowchart'})
  }

  return {
    ...field,
    of: normalized,
  }
}

export default function normalizeProjectCaseStudyBlocks(schema) {
  if (!schema || !Array.isArray(schema.fields)) return schema

  return {
    ...schema,
    fields: schema.fields.map((field) => {
      if (field?.name !== 'body' && field?.name !== 'bodyEn') return field
      return normalizeBodyField(field)
    }),
  }
}
