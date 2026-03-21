'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Tab = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit() {
    setErr('')
    if (!email || !pw) { setErr('Enter email and password'); return }
    if (tab === 'signup') {
      if (pw !== pw2) { setErr('Passwords do not match'); return }
      if (pw.length < 6) { setErr('Password must be at least 6 characters'); return }
    }
    setLoading(true)
    const supabase = createClient()
    try {
      let error
      if (tab === 'login') {
        const res = await supabase.auth.signInWithPassword({ email, password: pw })
        error = res.error
      } else {
        const res = await supabase.auth.signUp({ email, password: pw })
        error = res.error
        if (!error && !res.data.session) {
          setErr('Check your email to confirm, then login. Or disable email confirmation in Supabase Auth settings.')
          setLoading(false); return
        }
      }
      if (error) {
        const msg = error.message || ''
        if (msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('not verified')) {
          setErr('Email not confirmed. Disable "Enable email confirmations" in Supabase → Authentication → Settings.')
        } else if (msg.toLowerCase().includes('invalid')) {
          setErr('Wrong email or password.')
        } else {
          setErr(msg)
        }
        setLoading(false); return
      }
      router.push('/dashboard')
      router.refresh()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Authentication failed')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>💰</div>
          <h1 className="hd" style={{ fontSize: 30, fontWeight: 800, color: 'var(--color-accent)', margin: '0 0 4px' }}>FinLedger</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, margin: 0 }}>Personal Finance Tracker</p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Tab toggle */}
          <div style={{ display: 'flex', gap: 6, background: 'var(--color-surface)', borderRadius: 12, padding: 4 }}>
            {(['login', 'signup'] as Tab[]).map(t => (
              <button key={t} onClick={() => { setTab(t); setErr('') }}
                style={{ flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  background: tab === t ? 'var(--color-accent)' : 'none',
                  color: tab === t ? '#0b0b18' : 'var(--color-muted)',
                  transition: 'all 0.18s'
                }}>
                {t === 'login' ? 'Login' : 'Sign Up'}
              </button>
            ))}
          </div>

          <div>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" autoComplete="email"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div>
            <label>Password</label>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)}
              placeholder="Min 6 characters" autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          {tab === 'signup' && (
            <div>
              <label>Confirm Password</label>
              <input type="password" value={pw2} onChange={e => setPw2(e.target.value)}
                placeholder="Repeat password" autoComplete="new-password" />
            </div>
          )}

          {err && (
            <div style={{ background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.3)', borderRadius: 10, padding: '10px 13px', fontSize: 13, color: 'var(--color-expense)' }}>
              {err}
            </div>
          )}

          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="spinner" /> : tab === 'login' ? 'Login' : 'Create Account'}
          </button>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--color-faint)', fontSize: 11, marginTop: 12 }}>
          Your data stays in your Supabase · Secured by Supabase Auth
        </p>
      </div>
    </div>
  )
}
