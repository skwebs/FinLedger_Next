'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import AppShell from '@/components/layout/AppShell'
import DataProvider from '@/components/layout/DataProvider'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import TxForm from '@/components/transactions/TxForm'
import TxRow from '@/components/transactions/TxRow'
import { fmt, fmtDT, monthTxs, ccTxs, catIcon } from '@/lib/helpers'
import { ACC_TYPES, GROUP_ORDER } from '@/lib/constants'
import type { AccountType } from '@/lib/types'

function MonthPicker() {
  const { month, setMonth } = useStore()
  return (
    <input type="month" value={month} onChange={e => setMonth(e.target.value)}
      style={{ width: 'auto', padding: '6px 11px', fontSize: 11, borderRadius: 20, fontWeight: 600, border: '1px solid var(--color-border)', background: 'var(--color-card)' }} />
  )
}

function Settings() {
  const router = useRouter()
  const { toast } = useToast()
  const { recalcBalances } = useStore()
  const [open, setOpen] = useState(false)

  async function copyLoginLink() {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const link = `${window.location.origin}/login?sb=${btoa(url + '::' + key)}`
      await navigator.clipboard.writeText(link)
      toast('Login link copied!', 'ok')
    } catch { toast('Could not copy', 'err') }
    setOpen(false)
  }

  async function handleRecalc() {
    setOpen(false)
    try { await recalcBalances(); toast('Balances recalculated', 'ok') }
    catch (e: unknown) { toast(e instanceof Error ? e.message : 'Failed', 'err') }
  }

  const { createClient } = require('@/lib/supabase/client')
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-muted)', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, padding: 0 }}>⚙</button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <h3 className="hd" style={{ fontSize: 18, marginBottom: 16 }}>Settings</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
          <button className="btn btn-ghost" onClick={handleRecalc}>♻️ Recalculate All Balances</button>
          <button className="btn btn-ghost" onClick={copyLoginLink}>🔗 Copy Login Link</button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setOpen(false)} style={{ flex: 1 }}>Close</button>
          <button className="btn" onClick={handleLogout} style={{ flex: 1, background: 'var(--color-expense)', color: '#fff' }}>Sign Out</button>
        </div>
      </Modal>
    </>
  )
}

function DashboardContent() {
  const { accounts, transactions, month } = useStore()
  const [addOpen, setAddOpen] = useState(false)
  const router = useRouter()

  const txs = monthTxs(transactions, month)
  const realAccounts = accounts.filter(a => a.type !== 'person')
  const personAccounts = accounts.filter(a => a.type === 'person')
  const totalBal = realAccounts.reduce((s, a) => s + a.balance, 0)
  const owed = personAccounts.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0)
  const owing = personAccounts.filter(a => a.balance < 0).reduce((s, a) => s + Math.abs(a.balance), 0)
  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const mLabel = new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const catMap: Record<string, number> = {}
  txs.filter(t => t.type === 'expense').forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount })
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <AppShell title="Dashboard" showFab onFab={() => setAddOpen(true)}
      headerRight={<div style={{ display: 'flex', gap: 7, alignItems: 'center' }}><MonthPicker /><Settings /></div>}>

      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Net worth */}
        <div className="card" style={{ background: 'linear-gradient(135deg,#1a1a38,#1e1e40)', textAlign: 'center', padding: '22px 16px' }}>
          <div className="slabel" style={{ textAlign: 'center' }}>Net Worth (Real Accounts)</div>
          <div className="mono" style={{ fontSize: 36, fontWeight: 700, color: totalBal >= 0 ? 'var(--color-accent)' : 'var(--color-expense)' }}>{fmt(totalBal)}</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>{mLabel}</div>
          {personAccounts.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--color-person)', fontWeight: 600 }}>OWED TO YOU</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-person)' }}>{fmt(owed)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 600 }}>YOU OWE</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-sub)' }}>{fmt(owing)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: '↑ IN', val: income, col: 'var(--color-income)' },
            { label: '↓ OUT', val: expense, col: 'var(--color-expense)' },
            { label: 'SAVED', val: income - expense, col: income - expense >= 0 ? 'var(--color-income)' : 'var(--color-expense)' },
          ].map(({ label, val, col }) => (
            <div key={label} className="card" style={{ textAlign: 'center', padding: '12px 6px' }}>
              <div style={{ fontSize: 10, color: col, fontWeight: 600, marginBottom: 5 }}>{label}</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: col }}>{fmt(val)}</div>
            </div>
          ))}
        </div>

        {/* Account groups overview */}
        {accounts.length > 0 ? (
          <div className="card">
            <div className="slabel">Accounts Overview</div>
            {GROUP_ORDER.map(grpKey => {
              const accs = accounts.filter(a => a.type === grpKey)
              if (!accs.length) return null
              const at = ACC_TYPES.find(t => t.group === grpKey)!
              let sumLabel = ''
              if (grpKey === 'credit_card') {
                const total = accs.reduce((s, a) => s + ccTxs(a, transactions, 0).filter(t => t.type === 'expense').reduce((ss, t) => ss + t.amount, 0), 0)
                sumLabel = `${fmt(total)} cycle`
              } else if (grpKey === 'person') {
                const net = accs.reduce((s, a) => s + a.balance, 0)
                sumLabel = net >= 0 ? `Owed: ${fmt(net)}` : `You owe: ${fmt(Math.abs(net))}`
              } else {
                sumLabel = fmt(accs.reduce((s, a) => s + a.balance, 0))
              }
              return (
                <div key={grpKey} onClick={() => router.push('/accounts')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderTop: '1px solid var(--color-border)', cursor: 'pointer' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-sub)' }}>{at.groupLabel} <span style={{ color: 'var(--color-faint)', fontSize: 11 }}>({accs.length})</span></div>
                  <div className="mono" style={{ fontSize: 13, color: at.groupColor }}>{sumLabel}</div>
                </div>
              )
            })}
            <button className="btn btn-ghost" onClick={() => router.push('/accounts')} style={{ fontSize: 13, padding: 9, marginTop: 8 }}>View All Accounts →</button>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: 28 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏦</div>
            <div className="hd" style={{ fontWeight: 700, marginBottom: 6 }}>No Accounts Yet</div>
            <p style={{ color: 'var(--color-sub)', fontSize: 13, marginBottom: 16 }}>Add accounts to start tracking.</p>
            <button className="btn btn-primary" onClick={() => router.push('/accounts')} style={{ width: 'auto', padding: '10px 28px' }}>+ Add Account</button>
          </div>
        )}

        {/* Top spending */}
        {topCats.length > 0 && (
          <div className="card">
            <div className="slabel">Top Spending · {mLabel}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topCats.map(([cat, amt]) => (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{catIcon(cat)} {cat}</span>
                    <span className="mono" style={{ fontSize: 14, color: 'var(--color-expense)' }}>{fmt(amt)}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--color-surface)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${expense > 0 ? (amt / expense * 100).toFixed(1) : 0}%`, height: '100%', background: 'var(--color-accent)', borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent */}
        {txs.slice(0, 8).length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="slabel" style={{ padding: 0 }}>Recent Transactions</span>
              <span style={{ fontSize: 12, color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600 }} onClick={() => router.push('/transactions')}>See All →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {txs.slice(0, 8).map((t, i, arr) => (
                <div key={t.id}>
                  <TxRow tx={t} showAccount />
                  {i < arr.length - 1 && <div className="sep" style={{ margin: '8px 0' }} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)}>
        <TxForm onDone={() => setAddOpen(false)} />
      </Modal>
    </AppShell>
  )
}

export default function DashboardPage() {
  return (
    <ToastProvider>
      <DataProvider>
        <DashboardContent />
      </DataProvider>
    </ToastProvider>
  )
}
