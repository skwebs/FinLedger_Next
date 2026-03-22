import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Anon client — calls SECURITY DEFINER function which handles auth internally
// No SUPABASE_SERVICE_ROLE_KEY needed
function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const db = anonClient()

  // Single RPC call — the SECURITY DEFINER function handles everything:
  // token validation, expiry check, account fetch, transactions fetch
  const { data, error } = await db.rpc('get_shared_statement', { p_token: token })

  if (error) {
    return NextResponse.json({ error: 'Could not load statement' }, { status: 500 })
  }

  if (data?.error) {
    const status = data.error.includes('expired') ? 410 : 404
    return NextResponse.json({ error: data.error }, { status })
  }

  return NextResponse.json(data)
}
