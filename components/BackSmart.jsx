'use client'

import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'

export default function BackSmart({fallback = '/'}) {
  const router = useRouter()
  const [canBack, setCanBack] = useState(false)

  useEffect(() => {
    // If user landed directly, history length is usually small.
    setCanBack(typeof window !== 'undefined' && window.history.length > 1)
  }, [])

  const onClick = () => {
    if (canBack) router.back()
    else router.push(fallback)
  }

  return (
    <button className="btn" type="button" onClick={onClick} aria-label="Back">
      ← Back
    </button>
  )
}
