'use client'

import {useEffect, useMemo, useState} from 'react'

export default function WorkTabs({ groups = [], wrapperId = 'workWrap', initialKey = 'All' }) {
  const keys = useMemo(() => ['All', ...groups.map((g) => g.key)], [groups])
  const [active, setActive] = useState(initialKey || 'All')

  useEffect(() => {
    const el = document.getElementById(wrapperId)
    if (!el) return
    el.dataset.active = active
  }, [active, wrapperId])

  // ensure initial value exists
  useEffect(() => {
    const el = document.getElementById(wrapperId)
    if (!el) return
    if (!el.dataset.active) el.dataset.active = active
  }, [wrapperId])

  if (!groups?.length) return null

  return (
    <div className="work-tabs" aria-label="Organizations">
      <div className="tabs-row">
        {keys.map((k) => {
          const g = groups.find((x) => x.key === k)
          const logo = g?.logoUrl
          return (
            <button
              key={k}
              type="button"
              className={k === active ? 'tab active' : 'tab'}
              onClick={() => setActive(k)}
            >
              {logo ? (
                <img className="tab-logo" src={logo} alt="" aria-hidden="true" />
              ) : (
                <span className="tab-mark" aria-hidden="true" />
              )}
              <span className="tab-text">{k}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
