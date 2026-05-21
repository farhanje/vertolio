'use client'

import {useEffect, useRef} from 'react'

export default function Comments({repo}) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return

    // Prevent duplicate injection
    if (ref.current.querySelector('iframe')) return

    const script = document.createElement('script')
    script.src = 'https://utteranc.es/client.js'
    script.async = true
    script.crossOrigin = 'anonymous'
    script.setAttribute('repo', repo)
    script.setAttribute('issue-term', 'pathname')
    script.setAttribute('label', 'comment')
    script.setAttribute('theme', 'github-light')

    ref.current.appendChild(script)
  }, [repo])

  if (!repo) return null

  return (
    <section className="comments" aria-label="Comments">
      <div className="comments-head">
        <div className="kicker"><span className="dot" /> Comments</div>
      </div>
      <div className="comments-body" ref={ref} />
    </section>
  )
}
