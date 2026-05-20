export function truncateText(input, max = 140) {
  const s = String(input || '').trim()
  if (!s) return ''
  if (s.length <= max) return s
  return s.slice(0, Math.max(0, max - 1)).trimEnd() + '…'
}
