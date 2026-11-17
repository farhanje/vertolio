// All times are in seconds. The same defaults drive Sanity and both birthday routes.
export const DEFAULT_OPENING_TIMING = Object.freeze({
  portfolioSeconds: 1.5,
  firstLineSeconds: 1.8,
  secondLineSeconds: 1.5,
  thirdLineSeconds: 2.2,
  revealSeconds: 1.2,
})

const LIMITS = {
  portfolioSeconds: [0.5, 15],
  firstLineSeconds: [0.5, 15],
  secondLineSeconds: [0.5, 15],
  thirdLineSeconds: [0.5, 15],
  revealSeconds: [0.3, 8],
}

export function resolveOpeningTiming(value) {
  const input = value && typeof value === 'object' ? value : {}
  const timing = {}
  for (const [key, fallback] of Object.entries(DEFAULT_OPENING_TIMING)) {
    const incoming = input[key]
    const number = typeof incoming === 'number' && Number.isFinite(incoming) ? incoming : fallback
    const [min, max] = LIMITS[key]
    timing[key] = Math.max(min, Math.min(max, number))
  }
  return timing
}

export function getOpeningTimeline(value) {
  const t = resolveOpeningTiming(value)
  const firstLineAt = t.portfolioSeconds
  const secondLineAt = firstLineAt + t.firstLineSeconds
  const thirdLineAt = secondLineAt + t.secondLineSeconds
  const revealAt = thirdLineAt + t.thirdLineSeconds
  return {
    ...t,
    firstLineAt,
    secondLineAt,
    thirdLineAt,
    revealAt,
    totalSeconds: revealAt + t.revealSeconds,
  }
}
