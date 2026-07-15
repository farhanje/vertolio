const DEFAULT_SELECTIVE_DAILY_CALL_LIMIT = 20

export function ensureSelectiveAiLimits() {
  const configured = Number(process.env.PROMO_LLM_DAILY_CALL_LIMIT)
  const effective = Number.isFinite(configured) && configured > 0
    ? Math.min(Math.floor(configured), DEFAULT_SELECTIVE_DAILY_CALL_LIMIT)
    : DEFAULT_SELECTIVE_DAILY_CALL_LIMIT

  process.env.PROMO_LLM_DAILY_CALL_LIMIT = String(effective)
  return {dailyCallLimit: effective}
}
