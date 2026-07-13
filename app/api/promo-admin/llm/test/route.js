import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase.server'
import { getPromoLlmConfig, testPromoLlmConnection } from '@/lib/promo/llm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const config = getPromoLlmConfig()

  if (!config.apiKeyConfigured) {
    return NextResponse.json({
      ok: false,
      error: 'GEMINI_API_KEY is not configured',
      config,
    }, {status: 400})
  }

  const startedAt = Date.now()
  const result = await testPromoLlmConnection(supabaseServer())
  const payload = {
    ...result,
    latencyMs: Date.now() - startedAt,
    config,
  }

  return NextResponse.json(payload, {status: result.ok ? 200 : 400})
}

export async function GET() {
  return NextResponse.json({error: 'Method not allowed'}, {status: 405})
}
