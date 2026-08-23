import CardMedia from './CardMedia'

function cleanMeta(items = []) {
  return items.filter(Boolean).slice(0, 3)
}

export function EditorialCardContent({
  title,
  summary,
  image,
  alt,
  logo,
  index,
  eyebrow,
  meta = [],
  statValue,
  statLabel,
  featured = false,
  titleClassName = '',
  summaryClassName = '',
}) {
  const metaItems = cleanMeta(meta)

  return (
    <div
      className={featured ? 'editorial-card-inner editorial-card-featured-grid' : 'editorial-card-inner'}
      style={featured ? undefined : {display: 'flex', flexDirection: 'column', height: '100%'}}
    >
      <CardMedia image={image} alt={alt} logo={logo} ratio="3:2" />

      <div className="editorial-copy" style={{height: 'auto', flex: '1 1 auto'}}>
        <div className="editorial-overline">
          <span className="editorial-index">{index}</span>
          {eyebrow ? <span className="editorial-eyebrow notranslate">{eyebrow}</span> : null}
        </div>

        <h3 className={titleClassName}>{title}</h3>
        {summary ? <p className={summaryClassName}>{summary}</p> : null}

        <div className="editorial-foot">
          {metaItems.length ? (
            <div className="editorial-meta">
              {metaItems.map((item, idx) => (
                <span key={`${item}-${idx}`}>
                  {idx > 0 ? <span className="editorial-meta-sep"> / </span> : null}
                  {item}
                </span>
              ))}
            </div>
          ) : <span />}

          {statValue ? (
            <div className="editorial-stat">
              <strong>{statValue}</strong>
              {statLabel ? <span>{statLabel}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function EditorialCard({href, className = '', ...props}) {
  const featured = Boolean(props.featured)
  const classes = [
    'editorial-card',
    'card-link',
    featured ? 'editorial-card-featured' : 'editorial-card-standard',
    className,
  ].filter(Boolean).join(' ')

  return (
    <a className={classes} href={href}>
      <EditorialCardContent {...props} />
    </a>
  )
}
