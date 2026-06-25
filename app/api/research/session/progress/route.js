import {NextResponse} from 'next/server'
import {supabaseServer} from '@/lib/supabase.server'

function jsonError(message, status = 500, detail = null) {
  return NextResponse.json(
    {
      error: message,
      ...(detail ? {detail} : {}),
    },
    {status}
  )
}

export async function POST(req) {
  try {
    const body = await req.json()
    const sessionId = String(body.sessionId || '').trim()
    const progressState = body.progressState

    if (!sessionId) return jsonError('Missing sessionId', 400)
    if (!progressState || typeof progressState !== 'object' || Array.isArray(progressState)) {
      return jsonError('Missing progressState', 400)
    }

    const sb = supabaseServer()
    const {error} = await sb
      .from('sessions')
      .update({progressState})
      .eq('id', sessionId)
      .neq('completionStatus', 'completed')

    if (error) throw error

    return NextResponse.json({status: 'ok'})
  } catch (e) {
    return jsonError('Server error', 500, String(e?.message || e))
  }
}
