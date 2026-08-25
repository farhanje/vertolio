const CASE_STUDY_BLOCK_TYPES = new Set([
  'narrativeSection',
  'interactivePrototype',
  'artifactExplorer',
  'comparison',
  'dataVisualization',
  'evidenceGrid',
])

function normalizeBodyField(field) {
  if (!Array.isArray(field?.of)) return field

  return {
    ...field,
    of: field.of.map((member) => {
      if (member?.type === 'object' && CASE_STUDY_BLOCK_TYPES.has(member?.name)) {
        return {type: member.name}
      }
      return member
    }),
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
