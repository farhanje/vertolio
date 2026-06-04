import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase.server'

function randToken(len = 28) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export async function POST(req) {
  try {
    const body = await req.json()
    const studySlug = String(body.studySlug || '').trim()
    const deviceId = String(body.deviceId || '').trim()
    const meta = body.meta || {}

    if (!studySlug) return NextResponse.json({ error: 'Missing studySlug' }, { status: 400 })
    if (!deviceId) return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 })

    const sb = supabaseServer()

    // Ensure study exists in DB (we keep config in Sanity; DB is for logging)
    let { data: study } = await sb.from('studies').select('*').eq('slug', studySlug).maybeSingle()
    if (!study) {
      const ins = await sb.from('studies').insert({ slug: studySlug, title: studySlug, status: 'active' }).select('*').single()
      study = ins.data
    }

    if (!study || study.status !== 'active') {
      return NextResponse.json({ error: 'Study is not active' }, { status: 403 })
    }

    // SINGLE LINK MODE:
    // We internally create/find a token record per (studyId + deviceId).
    let { data: tokenRow } = await sb
      .from('study_tokens')
      .select('*')
      .eq('studyId', study.id)
      .eq('deviceId', deviceId)
      .order('createdAt', { ascending: false })
      .maybeSingle()

    // If a completed token exists, block re-run (best-effort).
    if (tokenRow && tokenRow.status === 'completed') {
      // Try to find session for UI convenience
      const { data: sess } = await sb
        .from('sessions')
        .select('*')
        .eq('tokenId', tokenRow.id)
        .maybeSingle()

      return NextResponse.json({
        status: 'completed',
        variant: tokenRow.variantAssigned,
        sessionId: sess?.id || null,
      })
    }

    // If token doesn't exist yet, create one.
    if (!tokenRow) {
      const token = randToken(28)
      const created = await sb
        .from('study_tokens')
        .insert({
          studyId: study.id,
          token,
          status: 'unused',
          deviceId,
          userAgent: meta.ua || null,
        })
        .select('*')
        .single()
      tokenRow = created.data
    }

    // Assign variant if not assigned.
    if (!tokenRow.variantAssigned) {
      const { data: counts } = await sb
        .from('sessions')
        .select('variant')
        .eq('studyId', study.id)

      const a = (counts || []).filter((r) => r.variant === 'A').length
      const b = (counts || []).filter((r) => r.variant === 'B').length
      const assigned = a === b ? (Math.random() < 0.5 ? 'A' : 'B') : (a < b ? 'A' : 'B')

      const upd = await sb
        .from('study_tokens')
        .update({ variantAssigned: assigned })
        .eq('id', tokenRow.id)
        .select('*')
        .single()
      tokenRow = upd.data
    }

    // Create or get session (1 session per tokenId)
    let { data: session } = await sb.from('sessions').select('*').eq('tokenId', tokenRow.id).maybeSingle()

    if (!session) {
      const createdSession = await sb
        .from('sessions')
        .insert({
          studyId: study.id,
          tokenId: tokenRow.id,
          variant: tokenRow.variantAssigned,
          completionStatus: 'in_progress',
        })
        .select('*')
        .single()
      session = createdSession.data

      await sb
        .from('study_tokens')
        .update({ status: 'started', startedAt: new Date().toISOString(), userAgent: meta.ua || null })
        .eq('id', tokenRow.id)
    }

    return NextResponse.json({
      status: 'ok',
      variant: tokenRow.variantAssigned,
      sessionId: session.id,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Server error', detail: String(e?.message || e) }, { status: 500 })
  }
}
