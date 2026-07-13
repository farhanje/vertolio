import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase.server'
import { isValidSchedulerRequest } from '@/lib/promo/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function deleteExpiredPromotions(sb, nowIso) {
  let deleted = 0

  for (;;) {
    const batch = await sb
      .from('promotions')
      .select('id')
      .lt('expires_at', nowIso)
      .limit(500)

    if (batch.error) throw batch.error
    const ids = (batch.data || []).map((item) => item.id)
    if (!ids.length) break

    const reviews = await sb.from('promo_review_queue').delete().in('promotion_id', ids)
    if (reviews.error) throw reviews.error

    const promotions = await sb.from('promotions').delete().in('id', ids)
    if (promotions.error) throw promotions.error
    deleted += ids.length
  }

  return deleted
}

export async function POST(request) {
  if (!isValidSchedulerRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = supabaseServer()
  const now = new Date()
  const nowIso = now.toISOString()
  const soon = new Date(now.getTime() + 7 * 86400000)

  let deletedExpired = 0
  try {
    deletedExpired = await deleteExpiredPromotions(sb, nowIso)
  } catch (error) {
    return NextResponse.json({
      error: 'Could not delete expired promotions',
      detail: String(error?.message || error),
    }, { status: 500 })
  }

  const expiringSoon = await sb
    .from('promotions')
    .update({ status: 'expiring_soon' })
    .gte('expires_at', nowIso)
    .lte('expires_at', soon.toISOString())
    .in('status', ['active','expiring_soon'])

  if (expiringSoon.error) {
    return NextResponse.json({ error: 'Could not mark expiring promotions', detail: expiringSoon.error.message }, { status: 500 })
  }

  const upcoming = await sb
    .from('promotions')
    .update({ status: 'upcoming' })
    .gt('starts_at', nowIso)
    .neq('status', 'removed')

  if (upcoming.error) {
    return NextResponse.json({ error: 'Could not mark upcoming promotions', detail: upcoming.error.message }, { status: 500 })
  }

  const active = await sb
    .from('promotions')
    .update({ status: 'active' })
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`expires_at.is.null,expires_at.gt.${soon.toISOString()}`)
    .in('status', ['upcoming','expiring_soon','active'])

  if (active.error) {
    return NextResponse.json({ error: 'Could not refresh active promotions', detail: active.error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    checkedAt: nowIso,
    deletedExpired,
    expiringSoonThresholdDays: 7,
  })
}
