'use client'

import {useEffect, useState} from 'react'
import {useParams} from 'next/navigation'
import ResearchRunner from '@/components/research/ResearchRunner'
import {useDeviceId} from '@/components/research/useDeviceId'
import './runner-overrides.css'

export default function ResearchStudyPage() {
  const params = useParams()
  const studySlug = params?.studySlug
  const deviceId = useDeviceId()

  const [state, setState] = useState({status: 'init'})

  useEffect(() => {
    if (!studySlug || !deviceId) return

    const run = async () => {
      setState({status: 'loading'})
      const res = await fetch('/api/research/start', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          studySlug,
          deviceId,
          meta: {
            ua: navigator.userAgent,
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            lang: navigator.language,
            ref: document.referrer || null,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
              devicePixelRatio: window.devicePixelRatio || 1,
            },
          },
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setState({status: 'error', error: json?.detail || json?.error || 'Error'})
        return
      }
      setState({status: 'ready', data: json})
    }

    run()
  }, [studySlug, deviceId])

  if (state.status === 'init' || state.status === 'loading') {
    return (
      <main className="container">
        <section className="section tight">
          <div className="kicker"><span className="dot" /> Research</div>
          <h1 style={{marginTop: 12}}>Loading…</h1>
          <p className="lead" style={{marginTop: 8}}>Preparing your session.</p>
        </section>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="container">
        <section className="section tight">
          <div className="kicker"><span className="dot" /> Research</div>
          <h1 style={{marginTop: 12}}>Can’t start</h1>
          <p className="lead" style={{marginTop: 8}}>{state.error}</p>
        </section>
      </main>
    )
  }

  const {data} = state

  if (data?.status === 'completed') {
    return (
      <main className="container">
        <section className="section tight">
          <div className="kicker"><span className="dot" /> Research</div>
          <h1 style={{marginTop: 12}}>Already completed</h1>
          <p className="lead" style={{marginTop: 8}}>This study has already been completed on this device.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="container">
      <ResearchRunner studySlug={studySlug} session={data} />
    </main>
  )
}
