import { NextResponse } from 'next/server'
import { sanityFetch } from '@/lib/sanity.client'
import { supabaseServer } from '@/lib/supabase.server'

const sanityVariantQuery = `*[_type == "researchStudy" && slug.current == $studySlug][0]{
  title,
  status,
  variants[]{
    key,
    "flowStepCount": count(coalesce(flowSteps, [])),
    "legacyTaskCount": count(coalesce(tasks, []))
  }
}`

function randToken(len = 28) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

function pickBalancedVariant(variantKeys, rows = []) {
  if (!variantKeys.length) return null

  const counts = Object.fromEntries(variantKeys.map((key) => [key, 0]))
  for (const row of rows || []) {
    if (row?.variant && counts[row.variant] !== undefined) counts[row.variant] += 1
  }

  const min = Math.min(...Object.values(counts))
  const candidates = variantKeys.filter((key) => counts[key] === min)
  return candidates[Math.floor(Math.random() * candidates.length)] || variantKeys[0]
}

function jsonError(message, status = 500, detail = null) {
  return NextResponse.json(
    {
      error: message,
      ...(detail ? { detail } : {}),
    },
    { status }
  )
}

export async function POST(req) {
  try {
    const body = await req.json()
    const studySlug = String(body.studySlug || '').trim()
    const deviceId = String(body.deviceId || '').trim()
    const meta = body.meta || {}

    if (!studySlug) return jsonError('Missing studySlug', 400)
    if (!deviceId) return jsonError('Missing deviceId', 400)

    const sanityStudy = await sanityFetch(sanityVariantQuery, { studySlug })
    if (!sanityStudy) return jsonError('Study config not found in Sanity', 404)
    if (sanityStudy.status !== 'active') return jsonError('Study config is not active', 403)

    const availableVariantKeys = (sanityStudy.variants || [])
      .filter((variant) => Number(variant.flowStepCount || 0) > 0 || Number(variant.legacyTaskCount || 0) > 0)
      .map((variant) => String(variant.key || '').trim())
      .filter(Boolean)

    if (!availableVariantKeys.length) {
      return jsonError('Study has no participant flow yet. Add at least one item in Variant → Study flow.', 400)
    }

    const sb = supabaseServer()

    // Ensure study exists in DB. Config lives in Sanity; DB is for runtime logging.
    const existingStudy = await sb.from('studies').select('*').eq('slug', studySlug).maybeSingle()
    if (existingStudy.error) {
      return jsonError('Cannot read study registry', 500, existingStudy.error.message)
    }

    let study = existingStudy.data
    if (!study) {
      const insertedStudy = await sb
        .from('studies')
        .insert({ slug: studySlug, title: sanityStudy.title || studySlug, status: 'active' })
        .select('*')
        .single()

      if (insertedStudy.error || !insertedStudy.data) {
        return jsonError('Cannot create study registry row', 500, insertedStudy.error?.message || 'Supabase returned no study row')
      }

      study = insertedStudy.data
    }

    if (study.status !== 'active') {
      return jsonError('Study is not active', 403)
    }

    if (!study.id) {
      return jsonError('Study registry row is missing id', 500)
    }

    // Current balance counts are based on actual completed/started sessions.
    const currentCounts = await sb.from('sessions').select('variant').eq('studyId', study.id)
    if (currentCounts.error) {
      return jsonError('Cannot read variant counts', 500, currentCounts.error.message)
    }

    const fallbackAssignedVariant = pickBalancedVariant(availableVariantKeys, currentCounts.data || [])
    if (!fallbackAssignedVariant) {
      return jsonError('Cannot assign variant', 500)
    }

    // SINGLE LINK MODE: one token record per study + device.
    const existingToken = await sb
      .from('study_tokens')
      .select('*')
      .eq('studyId', study.id)
      .eq('deviceId', deviceId)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingToken.error) {
      return jsonError('Cannot read study token', 500, existingToken.error.message)
    }

    let tokenRow = existingToken.data

    // If a completed token exists, block re-run.
    if (tokenRow && tokenRow.status === 'completed') {
      const existingSession = await sb.from('sessions').select('*').eq('tokenId', tokenRow.id).maybeSingle()
      if (existingSession.error) {
        return jsonError('Cannot read completed session', 500, existingSession.error.message)
      }

      return NextResponse.json({
        status: 'completed',
        variant: tokenRow.variantAssigned,
        sessionId: existingSession.data?.id || null,
      })
    }

    // If token doesn't exist yet, create it with a valid variant immediately.
    if (!tokenRow) {
      const createdToken = await sb
        .from('study_tokens')
        .insert({
          studyId: study.id,
          token: randToken(28),
          status: 'unused',
          deviceId,
          variantAssigned: fallbackAssignedVariant,
          userAgent: meta.ua || null,
        })
        .select('*')
        .single()

      if (createdToken.error || !createdToken.data) {
        return jsonError('Cannot create study token', 500, createdToken.error?.message || 'Supabase returned no token row')
      }

      tokenRow = createdToken.data
    }

    if (!tokenRow?.id) {
      return jsonError('Study token row is missing id', 500)
    }

    // Repair older tokens that were assigned to an empty/missing variant.
    if (!tokenRow.variantAssigned || !availableVariantKeys.includes(tokenRow.variantAssigned)) {
      const updatedToken = await sb
        .from('study_tokens')
        .update({ variantAssigned: fallbackAssignedVariant })
        .eq('id', tokenRow.id)
        .select('*')
        .single()

      if (updatedToken.error || !updatedToken.data) {
        return jsonError('Cannot update study token variant', 500, updatedToken.error?.message || 'Supabase returned no updated token row')
      }

      tokenRow = updatedToken.data
    }

    // Create or get session: 1 session per tokenId.
    const existingSession = await sb.from('sessions').select('*').eq('tokenId', tokenRow.id).maybeSingle()
    if (existingSession.error) {
      return jsonError('Cannot read session', 500, existingSession.error.message)
    }

    let session = existingSession.data

    if (!session) {
      const createdSession = await sb
        .from('sessions')
        .insert({
          studyId: study.id,
          tokenId: tokenRow.id,
          variant: tokenRow.variantAssigned,
          completionStatus: 'in_progress',
          deviceViewport: meta.viewport || null,
        })
        .select('*')
        .single()

      if (createdSession.error || !createdSession.data) {
        return jsonError('Cannot create session', 500, createdSession.error?.message || 'Supabase returned no session row')
      }

      session = createdSession.data

      const startedToken = await sb
        .from('study_tokens')
        .update({ status: 'started', startedAt: new Date().toISOString(), userAgent: meta.ua || null })
        .eq('id', tokenRow.id)

      if (startedToken.error) {
        return jsonError('Session was created, but token could not be marked started', 500, startedToken.error.message)
      }
    } else if (session.variant !== tokenRow.variantAssigned) {
      const updatedSession = await sb
        .from('sessions')
        .update({ variant: tokenRow.variantAssigned, deviceViewport: meta.viewport || session.deviceViewport || null })
        .eq('id', session.id)
        .select('*')
        .single()

      if (updatedSession.error || !updatedSession.data) {
        return jsonError('Cannot repair session variant', 500, updatedSession.error?.message || 'Supabase returned no updated session row')
      }

      session = updatedSession.data
    }

    if (!session?.id) {
      return jsonError('Session row is missing id', 500)
    }

    return NextResponse.json({
      status: 'ok',
      variant: tokenRow.variantAssigned,
      sessionId: session.id,
    })
  } catch (e) {
    return jsonError('Server error', 500, String(e?.message || e))
  }
}
