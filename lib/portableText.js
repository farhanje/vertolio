import {PortableText} from '@portabletext/react'
import {urlFor} from './sanity.image'
import YouTubeEmbed from '../components/YouTubeEmbed'
import Carousel from '../components/Carousel'

const components = {
  types: {
    image: ({value}) => {
      if (!value) return null
      const src = urlFor(value).width(1600).quality(85).auto('format').url()
      return (
        <figure className="figure">
          <img src={src} alt={value?.alt || ''} />
          {value?.caption ? <figcaption>{value.caption}</figcaption> : null}
        </figure>
      )
    },
    youtube: ({value}) => {
      return <YouTubeEmbed url={value?.url} title={value?.title} />
    },
    carousel: ({value}) => {
      return <Carousel title={value?.title} slides={value?.slides} />
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
