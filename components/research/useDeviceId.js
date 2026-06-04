'use client'

import {useEffect, useState} from 'react'

function genId() {
  // simple UUID-ish
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`
}

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState(null)

  useEffect(() => {
    try {
      const key = 'vertolio_device_id'
      let id = localStorage.getItem(key)
      if (!id) {
        id = genId()
        localStorage.setItem(key, id)
      }
      setDeviceId(id)
    } catch (_) {
      // fallback: still generate (won't persist)
      setDeviceId(genId())
    }
  }, [])

  return deviceId
}
