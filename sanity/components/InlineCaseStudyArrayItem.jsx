'use client'

const INLINE_CASE_STUDY_TYPES = new Set([
  'narrativeSection',
  'interactivePrototype',
  'prototypeStep',
  'prototypeHotspot',
  'artifactExplorer',
  'artifactTab',
  'comparison',
  'comparisonSide',
  'dataVisualization',
  'dataSeries',
  'dataRow',
  'dataValue',
  'evidenceGrid',
  'evidenceMetric',
])

export default function InlineCaseStudyArrayItem(props) {
  const schemaName = props?.schemaType?.name
  const inputProps = props?.inputProps

  if (!inputProps || !INLINE_CASE_STUDY_TYPES.has(schemaName)) {
    return props.renderDefault(props)
  }

  const inlineInput = inputProps.renderDefault(inputProps)

  return props.renderDefault({
    ...props,
    open: false,
    onOpen: () => {},
    children: (
      <div
        data-case-study-inline-editor="true"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          padding: '12px 4px 6px',
        }}
      >
        {inlineInput}
      </div>
    ),
  })
}
