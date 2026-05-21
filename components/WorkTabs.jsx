'use client'

import {useMemo, useState} from 'react'

export default function WorkTabs({ groups = [], initialKey = 'All', children }) {
  const keys = useMemo(() => {
    const base = groups.map((g) => g.key)
    return ['All', ...base]
  }, [groups])

  const [active, setActive] = useState(initialKey || 'All')

  if (!groups?.length) return <div className="work-panels">{children}</div>

  return (
    <div className="work-tabs-wrap" data-active={active}>
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

      <div className="work-panels">{children}</div>

      <style jsx global>{`
        .work-panels .org-block { display: none; }
        .work-tabs-wrap[data-active="All"] .work-panels .org-block { display: block; }
        ${groups
          .map((g) => `.work-tabs-wrap[data-active="${g.key}"] .work-panels .org-block[data-org="${g.key}"] { display:block; }`)
          .join('\n')}
      `}</style>
    </div>
  )
}
