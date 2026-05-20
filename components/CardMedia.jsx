import {urlFor} from '../lib/sanity.image'

function ratioToAspect(r) {
  if (!r || r === 'auto') return null
  if (r === '16:9') return '16 / 9'
  if (r === '4:3') return '4 / 3'
  if (r === '1:1') return '1 / 1'
  return null
}

export default function CardMedia({image, alt, logo, badge}) {
  const imgBuilder = image ? urlFor(image) : null
  const imgUrl = imgBuilder ? imgBuilder.width(1400).quality(80).auto('format').url() : null

  const logoBuilder = logo ? urlFor(logo) : null
  const logoUrl = logoBuilder ? logoBuilder.width(48).height(48).fit('max').quality(80).auto('format').url() : null

  const aspect = ratioToAspect(image?.ratio)

  if (!imgUrl && !logoUrl && !badge) return null

  return (
    <div className="card-media" style={aspect ? { aspectRatio: aspect } : undefined}>
      {imgUrl ? <img className="card-img" src={imgUrl} alt={alt || image?.alt || ''} /> : null}
      {logoUrl ? <img className="card-logo" src={logoUrl} alt="" aria-hidden="true" /> : null}
      {badge ? <span className="card-badge">{badge}</span> : null}
    </div>
  )
}
