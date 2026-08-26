import {PortableText} from '@portabletext/react'
import {urlFor} from './sanity.image'
import {getPrototypePreset} from './prototypePresets'
import YouTubeEmbed from '../components/YouTubeEmbed'
import Carousel from '../components/Carousel'
import ZoomableImage from '../components/ZoomableImage'
import InteractivePrototype from '../components/InteractivePrototype'
import ArtifactExplorer from '../components/ArtifactExplorer'
import DataVisualization from '../components/DataVisualization'
import {ComparisonBlock, EvidenceGrid, NarrativeSection} from '../components/CaseStudyBlocks'

function ratioToAspect(r) {
  if (!r || r === 'auto') return null
  if (r === '16:9') return '16 / 9'
  if (r === '16:10') return '16 / 10'
  if (r === '3:2') return '3 / 2'
  if (r === '4:3') return '4 / 3'
  if (r === '1:1') return '1 / 1'
  return null
}

function imageUrl(image, width = 1800, quality = 88) {
  if (!image) return null
  const builder = urlFor(image)
  return builder ? builder.width(width).quality(quality).auto('format').url() : null
}

function NoTranslate({children}) {
  return <div className="notranslate" translate="no">{children}</div>
}

function prototypeHotspots(hotspots = []) {
  return hotspots.map((hotspot) => ({
    label: hotspot?.label,
    nextKey: hotspot?.nextKey,
    x: Number(hotspot?.x),
    y: Number(hotspot?.y),
    width: Number(hotspot?.width),
    height: Number(hotspot?.height),
    event: hotspot?.event,
  })).filter((hotspot) => (
    hotspot.label &&
    hotspot.nextKey &&
    [hotspot.x, hotspot.y, hotspot.width, hotspot.height].every(Number.isFinite)
  ))
}

function prototypeSteps(steps = []) {
  return steps.map((step) => ({
    key: step?.stepKey || step?._key,
    src: imageUrl(step?.image, 1400, 90),
    label: step?.label,
    caption: step?.caption,
    alt: step?.alt || step?.label || '',
    annotation: step?.annotation,
    navNumber: step?.navNumber,
    counter: step?.counter,
    navGroup: step?.navGroup,
    showInNav: step?.showInNav !== false,
    nextKey: step?.nextKey,
    isEnd: step?.isEnd === true,
    event: step?.event,
    hotspots: prototypeHotspots(step?.hotspots),
  })).filter((step) => step.src && step.key)
}

function prototypeProps(value = {}) {
  const customSteps = prototypeSteps(value?.steps)
  const preset = getPrototypePreset(value?.preset)
  return {
    anchorId: value?.anchorId,
    eyebrow: value?.eyebrow,
    title: value?.title,
    description: value?.description,
    theme: value?.theme || 'dark',
    device: value?.device || 'phone',
    analyticsPrefix: value?.analyticsPrefix || preset?.analyticsPrefix || 'portfolio_prototype',
    steps: customSteps.length ? customSteps : preset?.steps || [],
  }
}

function dataVizProps(value = {}) {
  return {
    eyebrow: value?.eyebrow,
    title: value?.title,
    description: value?.description,
    takeaway: value?.takeaway,
    chartType: value?.chartType || 'line',
    dataSource: value?.dataSource || 'manual',
    series: value?.series || [],
    rows: value?.rows || [],
    csvRef: value?.csvFile?.asset?._ref,
    xColumn: value?.xColumn,
    xLabel: value?.xLabel,
    yLabel: value?.yLabel,
    baseline: value?.baseline,
    baselineLabel: value?.baselineLabel,
    evidenceStatus: value?.evidenceStatus,
    source: value?.source,
    period: value?.period,
    sample: value?.sample,
    methodNote: value?.methodNote,
    theme: value?.theme || 'light',
  }
}

function comparisonSide(value = {}) {
  return {
    ...value,
    imageUrl: imageUrl(value?.image, 1500, 88),
  }
}

function artifactTabs(tabs = []) {
  return tabs.map((tab) => ({
    _key: tab?._key,
    label: tab?.label,
    title: tab?.title,
    description: tab?.description,
    kind: tab?.kind || 'image',
    imageUrl: imageUrl(tab?.image, 1800, 88),
    alt: tab?.alt,
    caption: tab?.caption,
    prototype: tab?.prototype ? prototypeProps(tab.prototype) : null,
    dataViz: tab?.dataViz ? dataVizProps(tab.dataViz) : null,
  }))
}

const components = {
  types: {
    image: ({value}) => {
      if (!value) return null
      const src = imageUrl(value, 1800, 85)
      const width = value?.width || 'text'
      const aspect = ratioToAspect(value?.ratio)

      return (
        <figure className={`figure ${width === 'wide' ? 'figure-wide' : ''}`}>
          <div className="figure-media" style={aspect ? {aspectRatio: aspect} : undefined}>
            <ZoomableImage src={src} alt={value?.alt || ''} caption={value?.caption || ''} />
          </div>
          {value?.caption ? <figcaption>{value.caption}</figcaption> : null}
        </figure>
      )
    },
    youtube: ({value}) => <YouTubeEmbed url={value?.url} title={value?.title} />,
    carousel: ({value}) => <Carousel title={value?.title} slides={value?.slides} ratio={value?.ratio || '16:9'} />,
    narrativeSection: ({value}) => (
      <NarrativeSection
        eyebrow={value?.eyebrow}
        title={value?.title}
        body={value?.body}
        callout={value?.callout}
        theme={value?.theme || 'light'}
        width={value?.width || 'normal'}
      />
    ),
    interactivePrototype: ({value}) => (
      <NoTranslate><InteractivePrototype {...prototypeProps(value)} /></NoTranslate>
    ),
    artifactExplorer: ({value}) => (
      <NoTranslate>
        <ArtifactExplorer
          eyebrow={value?.eyebrow}
          title={value?.title}
          description={value?.description}
          theme={value?.theme || 'light'}
          tabs={artifactTabs(value?.tabs)}
        />
      </NoTranslate>
    ),
    comparison: ({value}) => (
      <ComparisonBlock
        eyebrow={value?.eyebrow}
        title={value?.title}
        description={value?.description}
        left={comparisonSide(value?.left)}
        right={comparisonSide(value?.right)}
        theme={value?.theme || 'light'}
      />
    ),
    dataVisualization: ({value}) => (
      <NoTranslate><DataVisualization {...dataVizProps(value)} /></NoTranslate>
    ),
    evidenceGrid: ({value}) => (
      <EvidenceGrid
        eyebrow={value?.eyebrow}
        title={value?.title}
        description={value?.description}
        metrics={value?.metrics || []}
        columns={value?.columns || 3}
        theme={value?.theme || 'light'}
      />
    ),
  },
  block: {
    h2: ({children}) => <h2>{children}</h2>,
    h3: ({children}) => <h3>{children}</h3>,
  },
}

export function RichText({value}) {
  if (!value) return null
  return (
    <div className="prose">
      <PortableText value={value} components={components} />
    </div>
  )
}
