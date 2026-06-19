import {NextResponse} from 'next/server'
import {supabaseServer} from '@/lib/supabase.server'

function isMissingSchema(error) {
  const msg = String(error?.message || error || '').toLowerCase()
  return msg.includes('column') || msg.includes('schema cache') || msg.includes('does not exist')
}

export async function POST(req) {
  try {
    const body = await req.json()
    const sessionId = String(body.sessionId || '').trim()

    if (!sessionId) return NextResponse.json({error: 'Missing sessionId'}, {status: 400})

    const sb = supabaseServer()
    const payload = {
      researchType: body.researchType || null,
      configSnapshot: body.configSnapshot || null,
      sanityRevision: body.sanityRevision || null,
      deviceViewport: body.deviceViewport || null,
    }

    const {error} = await sb.from('sessions').update(payload).eq('id', sessionId)

    // Keep the participant runner working even if the migration has not been run yet.
    if (error && isMissingSchema(error)) {
      return NextResponse.json({status: 'skipped', reason: 'migration_not_applied'})
    }

    if (error) throw error

    return NextResponse.json({status: 'ok'})
  } catch (e) {
    return NextResponse.json({error: 'Server error', detail: String(e?.message || e)}, {status: 500})
  }
}
