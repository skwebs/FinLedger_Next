'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useStore } from '@/store/useStore'
import AppShell from '@/components/layout/AppShell'
import DataProvider from '@/components/layout/DataProvider'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import AccForm from '@/components/accounts/AccForm'
import { fmt, monthTxs, ccTxs, daysLeft } from '@/lib/helpers'
import { ACC_TYPES, GROUP_ORDER, getPersonLabels } from '@/lib/constants'
import type { Account, AccountType } from '@/lib/types'

function MonthPicker() {
  const { month, setMonth } = useStore()
  return <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 'auto', padding: '6px 11px', fontSize: 11, borderRadius: 20, fontWeight: 600, border: '1px solid var(--color-border)', background: 'var(--color-card)' }} />
}

function AccCard({ acc }: { acc: Account }) {
  const { accounts, transactions, month, deleteAccount } = useStore()
  const { toast } = useToast()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [addTxOpen, setAddTxOpen] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [sharing, setSharing] = useState(false)

  const isCC = acc.type === 'credit_card' && acc.billing_day
  async function shareStatement() {
    setSharing(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check if a token already exists for this account
      const { data: existing, error: checkErr } = await supabase
        .from('share_tokens')
        .select('token')
        .eq('account_id', acc.id)
        .maybeSingle()

      // If table doesn't exist yet — guide the user
      if (checkErr?.message?.includes('does not exist') || checkErr?.code === '42P01') {
        toast('Run share_tokens_migration.sql in Supabase SQL Editor first — see README', 'err')
        setSharing(false); return
      }

      let token = existing?.token
      if (!token) {
        const { data: created, error: createErr } = await supabase
          .from('share_tokens')
          .insert([{ account_id: acc.id, user_id: user.id, label: acc.name }])
          .select('token')
          .single()
        if (createErr) throw createErr
        token = created.token
      }

      const link = `${window.location.origin}/share/${token}`
      const shareData = {
        title: `${acc.name} — Statement`,
        text: `View ${acc.name}'s statement on FinLedger`,
        url: link,
      }

      // Use native share sheet if available (Android, iOS, modern desktop)
      // Falls back to clipboard copy on unsupported browsers
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData)
        // No toast needed — native share sheet gives its own confirmation
      } else {
        await navigator.clipboard.writeText(link)
        toast('Link copied! Paste in WhatsApp, SMS or any app.', 'ok')
      }
    } catch (e: unknown) {
      // AbortError = user cancelled the share sheet — not an error
      if (e instanceof Error && e.name === 'AbortError') return
      toast(e instanceof Error ? e.message : 'Failed to generate link', 'err')
    } finally {
      setSharing(false)
    }
  }

  const isPerson = acc.type === 'person'
  const rel = isPerson ? getPersonLabels(acc.relationship_type) : null
  const mTxs = monthTxs(transactions, month).filter(t => t.account_id === acc.id)
  const mInc = mTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const mExp = mTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  let balDisplay
  if (isPerson && rel) {
    balDisplay = (
      <div style={{ textAlign: 'right' }}>
        <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: acc.balance > 0 ? 'var(--color-person)' : acc.balance < 0 ? 'var(--color-expense)' : 'var(--color-muted)' }}>
          {acc.balance > 0 ? '+' : acc.balance < 0 ? '−' : ''}{fmt(Math.abs(acc.balance))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
          {rel.balanceLbl(acc.balance)}
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
          <button
            className="edbtn"
            disabled={viewing}
            onClick={() => { setViewing(true); router.push(`/accounts/${acc.id}`) }}
            style={{ flex: 1, opacity: viewing ? 0.7 : 1, minWidth: 0 }}
          >
            {viewing
              ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'var(--color-text)', borderRadius: '50%', animation: 'spin .6s linear infinite', display: 'inline-block', flexShrink: 0 }} />
                  Loading
                </span>
              : 'View'
            }
          </button>
          <button className="edbtn" onClick={() => setEditing(true)}>✏️ Edit</button>
          {isPerson && (
            <button
              onClick={shareStatement}
              disabled={sharing}
              style={{ flex: 1, background: 'rgba(167,139,250,.12)', border: '1px solid rgba(167,139,250,.3)', borderRadius: 10, color: 'var(--color-person)', padding: 9, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', opacity: sharing ? 0.6 : 1 }}
            >
              {sharing ? '…' : '🔗 Share'}
            </button>
          )}
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
