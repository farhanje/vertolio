'use client'

import {useRef, useState} from 'react'

export default function BirthdayAudioPlayer({src, title}) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  if (!src) return null

  async function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (!audio.paused) {
      audio.pause()
      return
    }
    try {
      await audio.play()
    } catch (_) {
      setPlaying(false)
    }
  }

  return (
    <aside className="birthday-audio notranslate" aria-label="Birthday soundtrack">
      <audio ref={audioRef} src={src} preload="none" loop onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      <span className="birthday-audio-caption">THE SOUNDTRACK <span aria-hidden="true">/</span> {title}</span>
      <button type="button" onClick={toggle} aria-label={playing ? 'Pause soundtrack' : 'Play soundtrack'} aria-pressed={playing}>
        <span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span>
        {playing ? 'PAUSE' : 'PLAY'}
      </button>
    </aside>
  )
}
