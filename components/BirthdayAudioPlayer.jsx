'use client'

export default function BirthdayAudioPlayer({src, title}) {
  if (!src) return null
  return (
    <aside className="birthday-audio" aria-label="Birthday soundtrack">
      <span>♫ {title}</span>
      <audio controls loop preload="none" src={src} aria-label={title} />
    </aside>
  )
}
