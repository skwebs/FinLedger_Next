'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/store/useStore'
import AppShell from '@/components/layout/AppShell'
import DataProvider from '@/components/layout/DataProvider'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import AccForm from '@/components/accounts/AccForm'
import { fmt, monthTxs, ccTxs, daysLeft } from '@/lib/helpers'
import { ACC_TYPES, GROUP_ORDER } from '@/lib/constants'
import type { Account, AccountType } from '@/lib/types'

function MonthPicker() {
  const { month, setMonth } = useStore()
  return <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 'auto', padding: '6px 11px', fontSize: 11, borderRadius: 20, fontWeight: 600, border: '1px solid var(--color-border)', background: 'var(--color-card)' }} />
}

function AccCard({ acc }: { acc: Account }) {
  const { accounts, transactions, month, deleteAccount } = useStore()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [addTxOpen, setAddTxOpen] = useState(false)

  const isCC = acc.type === 'credit_card' && acc.billing_day
  const isPerson = acc.type === 'person'
  const mTxs = monthTxs(transactions, month).filter(t => t.account_id === acc.id)
  const mInc = mTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const mExp = mTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  let balDisplay
  if (isPerson) {
    const isOwed = acc.balance > 0
    balDisplay = (
      <div style={{ textAlign: 'right' }}>
        <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: isOwed ? 'var(--color-person)' : acc.balance < 0 ? 'var(--color-expense)' : 'var(--color-muted)' }}>
          {isOwed ? '+' : acc.balance < 0 ? '−' : ''}{fmt(Math.abs(acc.balance))}
        </div>
        <div style={{ fontSize: 11, color: isOwed ? 'var(--color-person)' : acc.balance < 0 ? 'var(--color-expense)' : 'var(--color-muted)' }}>
          {isOwed ? 'They owe you' : acc.balance < 0 ? 'You owe them' : 'Settled'}
        </div>
      </div>
    )
  } else {
    balDisplay = (
      <div style={{ textAlign: 'right' }}>
        <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: acc.balance < 0 ? 'var(--color-expense)' : 'var(--color-accent)' }}>{fmt(acc.balance)}</div>
        <div style={{ fontSize: 10, color: 'var(--color-muted)' }}>{acc.currency || 'INR'}</div>
      </div>
    )
  }

  return (
    <>
      <div className="card" style={{ borderLeft: `3px solid ${acc.color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <Link href={`/accounts/${acc.id}`} style={{ cursor: 'pointer', flex: 1, textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: acc.color }} />
              <div className="hd" style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{acc.name}</div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-muted)', paddingLeft: 18 }}>{acc.type.replace('_', ' ').toUpperCase()}</div>
          </Link>
          {balDisplay}
        </div>

        {isCC && (() => {
          const cyExp = ccTxs(acc, transactions, 0).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
          const usage = acc.credit_limit ? Math.min(100, cyExp / acc.credit_limit * 100) : 0
          const bc = usage > 80 ? 'var(--color-expense)' : usage > 50 ? 'var(--color-warning)' : 'var(--color-income)'
          const dl = daysLeft(acc.billing_day!)
          return (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--color-muted)', fontWeight: 600 }}>CYCLE SPEND</div>
                  <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-expense)' }}>{fmt(cyExp)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: 'var(--color-muted)', fontWeight: 600 }}>DUE</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: dl <= 5 ? 'var(--color-expense)' : 'var(--color-text)' }}>Day {acc.billing_day} · {dl}d</div>
                </div>
              </div>
              {acc.credit_limit && (
                <>
                  <div style={{ height: 5, background: 'var(--color-surface)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${usage}%`, height: '100%', background: bc, borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>{usage.toFixed(0)}% of {fmt(acc.credit_limit)}</div>
                </>
              )}
            </div>
          )
        })()}

        {!isCC && !isPerson && (mInc > 0 || mExp > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div className="card-inset">
              <div style={{ fontSize: 9, color: 'var(--color-income)', fontWeight: 600 }}>↑ MONTH IN</div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-income)' }}>{fmt(mInc)}</div>
            </div>
            <div className="card-inset">
              <div style={{ fontSize: 9, color: 'var(--color-expense)', fontWeight: 600 }}>↓ MONTH OUT</div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-expense)' }}>{fmt(mExp)}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 7 }}>
          <Link href={`/accounts/${acc.id}`} style={{ flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-text)', padding: 9, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>View</Link>
          <button className="edbtn" onClick={() => setEditing(true)}>✏️ Edit</button>
          <button className="btn btn-primary" onClick={() => setAddTxOpen(true)} style={{ flex: 2, borderRadius: 10, padding: 9, fontSize: 13 }}>+ Txn</button>
          <button className="dlbtn" style={{ flex: 'none', padding: '9px 12px' }} onClick={() => setConfirming(true)}>🗑️</button>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)}>
        <AccForm acc={acc} onDone={() => setEditing(false)} />
      </Modal>

      <Modal open={addTxOpen} onClose={() => setAddTxOpen(false)}>
        {/* Inline import to avoid circular deps */}
        {addTxOpen && (() => {
          const TxForm = require('@/components/transactions/TxForm').default
          return <TxForm preAccId={acc.id} onDone={() => setAddTxOpen(false)} />
        })()}
      </Modal>

      <Modal open={confirming} onClose={() => setConfirming(false)}>
        <h3 className="hd" style={{ fontSize: 18, marginBottom: 10 }}>Delete Account?</h3>
        <p style={{ color: 'var(--color-sub)', fontSize: 14, marginBottom: 20 }}><strong style={{ color: 'var(--color-text)' }}>{acc.name}</strong> and all its transactions will be permanently deleted.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setConfirming(false)} style={{ flex: 1 }}>Cancel</button>
          <button className="btn" onClick={async () => { try { await deleteAccount(acc.id); toast('Deleted', 'ok') } catch { toast('Failed', 'err') } setConfirming(false) }} style={{ flex: 1, background: 'var(--color-expense)', color: '#fff' }}>Delete</button>
        </div>
      </Modal>
    </>
  )
}

function AccountsContent() {
  const { accounts, transactions } = useStore()
  const [addOpen, setAddOpen] = useState(false)

  return (
    <AppShell title="Accounts" showFab onFab={() => setAddOpen(true)}
      headerRight={<MonthPicker />}>
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)} style={{ marginBottom: 16 }}>+ New Account</button>

        {accounts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--color-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏦</div>No accounts yet
          </div>
        ) : (
          GROUP_ORDER.map(grpKey => {
            const accs = accounts.filter(a => a.type === grpKey)
            if (!accs.length) return null
            const at = ACC_TYPES.find(t => t.group === grpKey)!
            let sumHTML: React.ReactNode
            if (grpKey === 'credit_card') {
              const total = accs.reduce((s, a) => s + ccTxs(a, transactions, 0).filter(t => t.type === 'expense').reduce((ss, t) => ss + t.amount, 0), 0)
              sumHTML = <span className="mono" style={{ fontSize: 13, color: 'var(--color-expense)' }}>{fmt(total)} cycle</span>
            } else if (grpKey === 'person') {
              const net = accs.reduce((s, a) => s + a.balance, 0)
              sumHTML = <span className="mono" style={{ fontSize: 13, color: net >= 0 ? 'var(--color-person)' : 'var(--color-expense)' }}>{net >= 0 ? `Owed: ${fmt(net)}` : `You owe: ${fmt(Math.abs(net))}`}</span>
            } else {
              sumHTML = <span className="mono" style={{ fontSize: 13, color: at.groupColor }}>{fmt(accs.reduce((s, a) => s + a.balance, 0))}</span>
            }
            return (
              <div key={grpKey} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0 8px', borderBottom: '1px solid var(--color-border)', marginBottom: 10 }}>
                  <div className="hd" style={{ fontWeight: 700, fontSize: 15, color: at.groupColor }}>{at.groupLabel}</div>
                  {sumHTML}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {accs.map(a => <AccCard key={a.id} acc={a} />)}
                </div>
              </div>
            )
          })
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)}>
        <AccForm onDone={() => setAddOpen(false)} />
      </Modal>
    </AppShell>
  )
}

export default function AccountsPage() {
  return (
    <ToastProvider>
      <DataProvider>
        <AccountsContent />
      </DataProvider>
    </ToastProvider>
  )
}
