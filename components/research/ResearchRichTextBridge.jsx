'use client'

import {useEffect, useMemo, useRef, useState} from 'react'
import {createRoot} from 'react-dom/client'
import {PortableText} from '@portabletext/react'

function hasRichText(value) {
  return Array.isArray(value) && value.length > 0
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeText(value) {
  return cleanText(value).replace(/\s+/g, ' ').toLowerCase()
}

function getEmbedUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null

  try {
    const url = new URL(rawUrl)
    if (!['http:', 'https:'].includes(url.protocol)) return null

    const host = url.hostname.replace(/^www\./, '')

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = url.searchParams.get('v')
      if (id) return `https://www.youtube.com/embed/${id}`
    }

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      if (id) return `https://www.youtube.com/embed/${id}`
    }

    if (host === 'vimeo.com') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      if (id) return `https://player.vimeo.com/video/${id}`
    }

    if (host === 'loom.com' && url.pathname.includes('/share/')) {
      const id = url.pathname.split('/').filter(Boolean).pop()
      if (id) return `https://www.loom.com/embed/${id}`
    }

    return rawUrl
  } catch {
    return null
  }
}

function ensureStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('research-rich-text-bridge-style')) return

  const style = document.createElement('style')
  style.id = 'research-rich-text-bridge-style'
  style.textContent = `
    .research-rich-text-mount { margin-top: 12px; max-width: 780px; }
    .research-rich-content { color: var(--muted); font-size: clamp(1rem, 1.8vw, 1.2rem); line-height: 1.72; }
    .research-rich-content > *:first-child { margin-top: 0; }
    .research-rich-content > *:last-child { margin-bottom: 0; }
    .research-rich-content h2, .research-rich-content h3 { color: var(--fg); line-height: 1.2; margin: 1.2em 0 .45em; }
    .research-rich-content h2 { font-size: clamp(1.4rem, 3vw, 2rem); }
    .research-rich-content h3 { font-size: clamp(1.15rem, 2.4vw, 1.45rem); }
    .research-rich-content p { margin: .7em 0; }
    .research-rich-content ul, .research-rich-content ol { margin: .8em 0 .8em 1.35em; padding: 0; }
    .research-rich-content li { margin: .35em 0; }
    .research-rich-content blockquote { border-left: 3px solid currentColor; margin: 1em 0; padding-left: 1em; opacity: .9; }
    .research-rich-content a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
    .research-rich-media { margin: 1.15em 0; }
    .research-rich-media img { display: block; width: 100%; max-width: 760px; border-radius: 20px; border: 1px solid rgba(127,127,127,.22); }
    .research-rich-media figcaption { margin-top: .55em; font-size: .9rem; color: var(--muted); opacity: .86; }
    .research-rich-embed { width: 100%; max-width: 760px; border-radius: 20px; overflow: hidden; border: 1px solid rgba(127,127,127,.22); background: rgba(127,127,127,.08); }
    .research-rich-embed iframe { display: block; width: 100%; height: 100%; border: 0; }
  `
  document.head.appendChild(style)
}

const portableTextComponents = {
  block: {
    h2: ({children}) => <h2>{children}</h2>,
    h3: ({children}) => <h3>{children}</h3>,
    blockquote: ({children}) => <blockquote>{children}</blockquote>,
    normal: ({children}) => <p>{children}</p>,
  },
  marks: {
    link: ({children, value}) => {
      const href = value?.href
      if (!href) return children
      return <a href={href} target="_blank" rel="noreferrer">{children}</a>
    },
  },
  types: {
    image: ({value}) => <RichImage value={value} />,
    richImage: ({value}) => <RichImage value={value} />,
    embedBlock: ({value}) => <RichEmbed value={value} />,
  },
}

function RichImage({value}) {
  const src = value?.imageUrl
  if (!src) return null

  return (
    <figure className="research-rich-media">
      <img src={src} alt={value?.alt || value?.caption || ''} />
      {value?.caption ? <figcaption>{value.caption}</figcaption> : null}
    </figure>
  )
}

function RichEmbed({value}) {
  const src = getEmbedUrl(value?.url)
  if (!src) return null

  return (
    <figure className="research-rich-media">
      <div className="research-rich-embed" style={{aspectRatio: value?.aspectRatio || '16 / 9'}}>
        <iframe
          src={src}
          title={value?.title || value?.caption || 'Embedded media'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
      {value?.caption ? <figcaption>{value.caption}</figcaption> : null}
    </figure>
  )
}

function RichTextContent({value}) {
  if (!hasRichText(value)) return null
  return (
    <div className="research-rich-content">
      <PortableText value={value} components={portableTextComponents} />
    </div>
  )
}

export default function ResearchRichTextBridge({studySlug}) {
  const [study, setStudy] = useState(null)
  const rootsRef = useRef(new Map())

  useEffect(() => {
    if (!studySlug) return

    let cancelled = false
    fetch(`/api/research/config?studySlug=${encodeURIComponent(studySlug)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.study) setStudy(json.study)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [studySlug])

  const richTargets = useMemo(() => {
    if (!study) return []
    return [
      {
        key: 'intro',
        title: study.introTitle || study.title,
        value: study.introBodyRich,
        requiresContinue: true,
      },
      {
        key: 'completion',
        title: study.completionTitle || 'Thank you',
        value: study.completionBodyRich,
        requiresContinue: false,
      },
    ].filter((item) => item.title && hasRichText(item.value))
  }, [study])

  useEffect(() => {
    if (!richTargets.length) return undefined

    ensureStyles()

    const mountRichText = () => {
      for (const target of richTargets) {
        const expectedTitle = normalizeText(target.title)
        const headings = Array.from(document.querySelectorAll('main.container section h1'))
        const heading = headings.find((item) => normalizeText(item.textContent) === expectedTitle)
        if (!heading) continue

        const section = heading.closest('section')
        if (!section) continue

        if (target.requiresContinue) {
          const hasContinueButton = Array.from(section.querySelectorAll('button')).some((button) => normalizeText(button.textContent) === 'continue')
          if (!hasContinueButton) continue
        }

        const originalLead = Array.from(section.querySelectorAll('p.lead')).find((item) => !item.dataset.researchRichTextFallback)
        if (originalLead) {
          originalLead.dataset.researchRichTextFallback = target.key
          originalLead.style.display = 'none'
        }

        let mount = section.querySelector(`[data-research-rich-text="${target.key}"]`)
        if (!mount) {
          mount = document.createElement('div')
          mount.className = 'research-rich-text-mount'
          mount.dataset.researchRichText = target.key
          heading.insertAdjacentElement('afterend', mount)
        }

        if (!rootsRef.current.has(mount)) {
          rootsRef.current.set(mount, createRoot(mount))
        }

        rootsRef.current.get(mount).render(<RichTextContent value={target.value} />)
      }
    }

    mountRichText()
    const observer = new MutationObserver(mountRichText)
    observer.observe(document.body, {childList: true, subtree: true})

    return () => {
      observer.disconnect()
      for (const root of rootsRef.current.values()) root.unmount()
      rootsRef.current.clear()
    }
  }, [richTargets])

  return null
}
