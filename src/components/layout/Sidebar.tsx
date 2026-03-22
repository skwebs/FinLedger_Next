'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  open: boolean
  onClose: () => void
  onImport?: () => void
  onExport?: () => void
}

function EmailModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const btnP: React.CSSProperties = { display: 'block', width: '100%', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, padding: '13px 20px', background: 'var(--color-accent)', color: '#0b0b18', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'center' }
  const btnG: React.CSSProperties = { display: 'block', width: '100%', border: '1.5px solid var(--color-border)', borderRadius: 12, fontWeight: 700, fontSize: 15, padding: '13px 20px', background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'center' }

  async function handleSubmit() {
    if (!email.trim() || !email.includes('@')) { toast('Enter valid email', 'err'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ email: email.trim() })
      if (error) throw error
      toast('Confirmation sent to both current and new email — click both links to complete.', 'ok')
      onClose()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Failed', 'err')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <h3 className="hd" style={{ fontSize: 18, marginBottom: 6 }}>Change Email</h3>
      <div style={{ background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 10, padding: '10px 13px', fontSize: 12, color: 'var(--color-sub)', marginBottom: 16, lineHeight: 1.6 }}>
        ⚠️ Supabase sends confirmation to <strong style={{ color: 'var(--color-text)' }}>both</strong> your current and new email. Click the link in each to complete the change.<br />
        <span style={{ color: 'var(--color-muted)', fontSize: 11 }}>Disable <em>Secure email change</em> in Supabase → Auth → Email to receive only one email.</span>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label>New Email Address</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@newdomain.com" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button style={{ ...btnG, flex: 1 }} onClick={onClose}>Cancel</button>
        <button style={{ ...btnP, flex: 2, opacity: loading ? 0.5 : 1 }} onClick={handleSubmit} disabled={loading}>
          {loading ? <span className="spinner" /> : 'Send Confirmation'}
        </button>
      </div>
    </div>
  )
}

function SidebarContent({ onClose, onImport, onExport }: SidebarProps) {
  const { toast } = useToast()
  const { recalcBalances } = useStore()
  const router = useRouter()
  const [emailOpen, setEmailOpen] = useState(false)

  async function handleRecalc() {
    onClose()
    try { await recalcBalances(); toast('Balances recalculated ✓', 'ok') }
    catch (e: unknown) { toast(e instanceof Error ? e.message : 'Failed', 'err') }
  }

  async function copyLoginLink() {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      await navigator.clipboard.writeText(`${window.location.origin}/login?sb=${btoa(url + '::' + key)}`)
      toast('Login link copied!', 'ok')
    } catch { toast('Could not copy', 'err') }
    onClose()
  }

  async function handleLogout() {
    onClose()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const item = (emoji: string, label: string, onClick: () => void, color?: string) => (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
      background: 'none', border: 'none', borderRadius: 12, padding: '12px 14px',
      cursor: 'pointer', fontFamily: 'var(--font-sans)', color: color || 'var(--color-text)',
      fontSize: 15, fontWeight: 500, transition: 'background .15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{emoji}</span>
      {label}
    </button>
  )

  const divider = () => <div style={{ height: 1, background: 'var(--color-border)', margin: '6px 0' }} />

  return (
    <>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--color-muted)', fontWeight: 700, letterSpacing: '1.4px' }}>FINLEDGER</div>
          <div className="hd" style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-accent)' }}>Menu</div>
        </div>
        <button onClick={onClose} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', color: 'var(--color-text)' }}>✕</button>
      </div>

      {/* Items */}
      <div style={{ padding: '10px 6px', flex: 1, overflowY: 'auto' }}>

        {/* Data */}
        <div style={{ padding: '4px 8px 2px', fontSize: 10, fontWeight: 700, color: 'var(--color-muted)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Data</div>
        {onImport && item('⬆️', 'Import Transactions', () => { onClose(); setTimeout(onImport, 200) })}
        {onExport && item('⬇️', 'Export Transactions', () => { onClose(); setTimeout(onExport, 200) })}
        {divider()}

        {/* Settings */}
        <div style={{ padding: '4px 8px 2px', fontSize: 10, fontWeight: 700, color: 'var(--color-muted)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Settings</div>
        {item('🗂️', 'Manage Categories', () => { onClose(); router.push('/categories') })}
        {item('✉️', 'Change Email', () => setEmailOpen(true))}
        {item('♻️', 'Recalculate Balances', handleRecalc)}
        {item('🔗', 'Copy Login Link', copyLoginLink)}
        {divider()}

        {/* Account */}
        {item('🚪', 'Sign Out', handleLogout, 'var(--color-expense)')}
      </div>

      {/* Email modal — rendered inside sidebar */}
      <Modal open={emailOpen} onClose={() => setEmailOpen(false)}>
        <EmailModal onClose={() => setEmailOpen(false)} />
      </Modal>
    </>
  )
}

export default function Sidebar(props: SidebarProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || !props.open) return null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex' }}>
      {/* Backdrop */}
      <div onClick={props.onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
      {/* Drawer */}
      <div style={{
        position: 'relative', width: 280, maxWidth: '85vw', height: '100%',
        background: 'var(--color-card)', borderRight: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInLeft .22s ease',
      }}>
        <SidebarContent {...props} />
      </div>
      <style>{`@keyframes slideInLeft { from { transform: translateX(-100%) } to { transform: translateX(0) } }`}</style>
    </div>,
    document.body
  )
}
