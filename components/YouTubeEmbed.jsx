'use client'

function extractId(urlOrId) {
  if (!urlOrId) return ''
  const s = String(urlOrId).trim()
  // If user pastes an ID already
  if (/^[a-zA-Z0-9_-]{8,}$/.test(s) && !s.includes('http')) return s

  try {
    const u = new URL(s)
    if (u.hostname.includes('youtu.be')) return u.pathname.replace('/', '')
    if (u.searchParams.get('v')) return u.searchParams.get('v')
    // embed URL
    const parts = u.pathname.split('/')
    const idx = parts.indexOf('embed')
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
  } catch (_) {
    return ''
  }
  return ''
}

export default function YouTubeEmbed({ url, title }) {
  const id = extractId(url)
  if (!id) return null

  return (
    <figure className="figure" style={{ marginTop: 18 }}>
      <div className="embed16x9">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          title={title || 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      {title ? <figcaption>{title}</figcaption> : null}
    </figure>
  )
}
