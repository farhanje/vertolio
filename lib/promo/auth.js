export function isValidSchedulerRequest(request) {
  const secret = process.env.PROMO_SCHEDULER_SECRET
  if (!secret) return false

  const authorization = request.headers.get('authorization') || ''
  const schedulerHeader = request.headers.get('x-scheduler-secret') || ''
  return authorization === `Bearer ${secret}` || schedulerHeader === secret
}
