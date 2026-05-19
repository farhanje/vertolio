import {PortableText} from '@portabletext/react'
import {urlFor} from './sanity.image'
import YouTubeEmbed from '../components/YouTubeEmbed'
import Carousel from '../components/Carousel'

function ratioToAspect(r) {
  if (!r || r === 'auto') return null
  if (r === '16:9') return '16 / 9'
  if (r === '4:3') return '4 / 3'
  if (r === '1:1') return '1 / 1'
  return null
}

const components = {
  types: {
    image: ({value}) => {
      if (!value) return null
      const src = urlFor(value).width(1800).quality(85).auto('format').url()
      const width = value?.width || 'text'
      const aspect = ratioToAspect(value?.ratio)

      return (
        <figure className={`figure ${width === 'wide' ? 'figure-wide' : ''}`}>
          <div className="figure-media" style={aspect ? { aspectRatio: aspect } : undefined}>
            <img src={src} alt={value?.alt || ''} />
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
