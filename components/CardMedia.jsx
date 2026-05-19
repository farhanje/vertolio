import {urlFor} from '../lib/sanity.image'

export default function CardMedia({image, alt, logo}) {
  const imgUrl = image ? urlFor(image).width(1200).quality(80).auto('format').url() : null
  const logoUrl = logo ? urlFor(logo).width(48).height(48).fit('max').quality(80).auto('format').url() : null

  if (!imgUrl && !logoUrl) return null

  return (
    <div className="card-media">
      {imgUrl ? <img className="card-img" src={imgUrl} alt={alt || ''} /> : null}
      {logoUrl ? <img className="card-logo" src={logoUrl} alt="" aria-hidden="true" /> : null}
    </div>
  )
}
