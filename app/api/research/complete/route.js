import {NextResponse} from 'next/server'
import {supabaseServer} from '@/lib/supabase.server'

export async function POST(req) {
  try {
    const body = await req.json()
    const sessionId = String(body.sessionId || '').trim()

    if (!sessionId) return NextResponse.json({error: 'Missing sessionId'}, {status: 400})

    const sb = supabaseServer()
    const {data: session, error: sessionError} = await sb
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError) throw sessionError
    if (!session) return NextResponse.json({error: 'Session not found'}, {status: 404})

    const endedAt = new Date().toISOString()

    const {error: sessionUpdateError} = await sb
      .from('sessions')
      .update({completionStatus: 'completed', endedAt})
      .eq('id', sessionId)

    if (sessionUpdateError) throw sessionUpdateError

    const {error: tokenUpdateError} = await sb
      .from('study_tokens')
      .update({status: 'completed', completedAt: endedAt})
      .eq('id', session.tokenId)

    if (tokenUpdateError) throw tokenUpdateError

    return NextResponse.json({status: 'ok'})
  } catch (e) {
    return NextResponse.json({error: 'Server error', detail: String(e?.message || e)}, {status: 500})
  }
}
