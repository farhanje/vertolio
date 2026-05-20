'use client'

import {useMemo, useState} from 'react'

export default function WorkTabs({groups = [], initialKey = 'All'}) {
  const keys = useMemo(() => {
    const base = groups.map((g) => g.key)
    return ['All', ...base]
  }, [groups])

  const [active, setActive] = useState(initialKey || 'All')

  const activeGroup = useMemo(() => {
    if (active === 'All') return null
    return groups.find((g) => g.key === active) || null
  }, [active, groups])

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
              {logo ? <img className="tab-logo" src={logo} alt="" aria-hidden="true" /> : <span className="tab-mark" aria-hidden="true" />}
              <span className="tab-text">{k}</span>
            </button>
          )
        })}
      </div>

      {/* Render target key for server list to read via data attr (no re-render needed) */}
      <div className="tab-state" data-active={active} />

      {/* NOTE: Cards are still rendered by server; CSS hides non-active groups in client via data-active */}
      <style jsx global>{`
        .org-block { display: none; }
        .tab-state[data-active="All"] ~ .org-block { display: block; }
        ${groups
          .map((g) => `.tab-state[data-active="${g.key}"] ~ .org-block[data-org="${g.key}"] { display:block; }`)
          .join('\n')}
      `}</style>
    </div>
  )
}
