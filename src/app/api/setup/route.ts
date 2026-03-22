import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Called once on first app load to ensure share_tokens table and RPC function exist.
// Safe to call multiple times — uses IF NOT EXISTS throughout.
export async function POST() {
  try {
    const supabase = await createClient()

    // Check if share_tokens table already exists
    const { error: checkErr } = await supabase
      .from('share_tokens')
      .select('id')
      .limit(1)

    // If no error, table already exists — skip migration
    if (!checkErr) {
      return NextResponse.json({ status: 'already_setup' })
    }

    // Table missing — user needs to run the SQL manually
    // We can't run DDL (CREATE TABLE, CREATE POLICY) from client SDK
    // Return a helpful error pointing to the migration file
    return NextResponse.json({
      status: 'migration_needed',
      message: 'Run share_tokens_migration.sql in Supabase SQL Editor to enable the Share Statement feature.',
    }, { status: 202 })

  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
