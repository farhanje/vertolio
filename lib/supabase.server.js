import { createClient } from '@supabase/supabase-js'

// Server-only Supabase client (service role)
// Required env vars (Vercel):
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY (server only)
export function supabaseServer() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
