import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase.server'
import { isValidSchedulerRequest } from '@/lib/promo/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  if (!isValidSchedulerRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = supabaseServer()
  const now = new Date()
  const soon = new Date(now.getTime() + 7 * 86400000)

  const expired = await sb
    .from('promotions')
    .update({ status: 'expired' })
    .lt('expires_at', now.toISOString())
    .neq('status', 'removed')

  if (expired.error) {
    return NextResponse.json({ error: 'Could not expire promotions', detail: expired.error.message }, { status: 500 })
  }

  const expiringSoon = await sb
    .from('promotions')
    .update({ status: 'expiring_soon' })
    .gte('expires_at', now.toISOString())
    .lte('expires_at', soon.toISOString())
    .in('status', ['active','expiring_soon'])

  if (expiringSoon.error) {
    return NextResponse.json({ error: 'Could not mark expiring promotions', detail: expiringSoon.error.message }, { status: 500 })
  }

  const upcoming = await sb
    .from('promotions')
    .update({ status: 'upcoming' })
    .gt('starts_at', now.toISOString())
    .neq('status', 'removed')

  if (upcoming.error) {
    return NextResponse.json({ error: 'Could not mark upcoming promotions', detail: upcoming.error.message }, { status: 500 })
  }

  const active = await sb
    .from('promotions')
    .update({ status: 'active' })
    .or(`starts_at.is.null,starts_at.lte.${now.toISOString()}`)
    .or(`expires_at.is.null,expires_at.gt.${soon.toISOString()}`)
    .in('status', ['upcoming','expiring_soon','active'])

  if (active.error) {
    return NextResponse.json({ error: 'Could not refresh active promotions', detail: active.error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    checkedAt: now.toISOString(),
    expiringSoonThresholdDays: 7,
  })
}
