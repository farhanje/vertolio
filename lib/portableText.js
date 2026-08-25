import {PortableText} from '@portabletext/react'
import {urlFor} from './sanity.image'
import YouTubeEmbed from '../components/YouTubeEmbed'
import Carousel from '../components/Carousel'
import ZoomableImage from '../components/ZoomableImage'
import InteractivePrototype from '../components/InteractivePrototype'

function ratioToAspect(r) {
  if (!r || r === 'auto') return null
  if (r === '16:9') return '16 / 9'
  if (r === '4:3') return '4 / 3'
  if (r === '1:1') return '1 / 1'
  return null
}

function prototypeSteps(steps = []) {
  return steps.map((step) => {
    const builder = step?.image ? urlFor(step.image) : null
    const src = builder ? builder.width(1400).quality(90).auto('format').url() : null

    return {
      key: step?._key,
      src,
      label: step?.label,
      caption: step?.caption,
      alt: step?.alt || step?.label || '',
    }
  }).filter((step) => step.src)
}

const components = {
  types: {
    image: ({value}) => {
      if (!value) return null
      const builder = urlFor(value)
      const src = builder ? builder.width(1800).quality(85).auto('format').url() : null
      const width = value?.width || 'text'
      const aspect = ratioToAspect(value?.ratio)

      return (
        <figure className={`figure ${width === 'wide' ? 'figure-wide' : ''}`}>
          <div className="figure-media" style={aspect ? { aspectRatio: aspect } : undefined}>
            <ZoomableImage src={src} alt={value?.alt || ''} caption={value?.caption || ''} />
          </div>
          {value?.caption ? <figcaption>{value.caption}</figcaption> : null}
        </figure>
      )
    },
    youtube: ({value}) => {
      return <YouTubeEmbed url={value?.url} title={value?.title} />
    },
    carousel: ({value}) => {
      return <Carousel title={value?.title} slides={value?.slides} ratio={value?.ratio || '16:9'} />
    },
    interactivePrototype: ({value}) => {
      return (
        <InteractivePrototype
          eyebrow={value?.eyebrow}
          title={value?.title}
          description={value?.description}
          theme={value?.theme || 'dark'}
          device={value?.device || 'phone'}
          steps={prototypeSteps(value?.steps)}
        />
      )
    },
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
