'use client'

import {useEffect} from 'react'
import {NextStudio} from 'next-sanity/studio'
import config from '../../../sanity.config'

export default function StudioPage() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const previousHtmlTranslate = html.getAttribute('translate')
    const previousBodyTranslate = body.getAttribute('translate')

    html.setAttribute('translate', 'no')
    body.setAttribute('translate', 'no')
    html.classList.add('notranslate')
    body.classList.add('notranslate')

    let meta = document.querySelector('meta[name="google"][content="notranslate"]')
    const createdMeta = !meta
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'google')
      meta.setAttribute('content', 'notranslate')
      document.head.appendChild(meta)
    }

    return () => {
      if (previousHtmlTranslate == null) html.removeAttribute('translate')
      else html.setAttribute('translate', previousHtmlTranslate)

      if (previousBodyTranslate == null) body.removeAttribute('translate')
      else body.setAttribute('translate', previousBodyTranslate)

      html.classList.remove('notranslate')
      body.classList.remove('notranslate')
      if (createdMeta) meta?.remove()
    }
  }, [])

  return (
    <div className="notranslate" translate="no" data-studio-no-translate="true">
      <NextStudio config={config} />
    </div>
  )
}
