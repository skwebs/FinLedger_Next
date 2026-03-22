'use client'
import { use, useEffect, useState } from 'react'
import { fmt, fmtDT, catIcon } from '@/lib/helpers'
import type { Transaction } from '@/lib/types'

interface StatementData {
  account: {
    id: string; name: string; type: string
    balance: number; currency: string
    billing_day: number | null; credit_limit: number | null; color: string
  }
  transactions: Transaction[]
  label: string | null
  generated: string
}

const C = {
  bg: '#0b0b18', card: '#181830', border: '#2a2a4a',
  accent: '#f59e0b', text: '#f0f0ff', sub: '#b0b0d8',
  muted: '#7878a8', income: '#10b981', expense: '#f43f5e',
  transfer: '#60a5fa', person: '#a78bfa',
}

export default function PublicStatementPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [data, setData] = useState<StatementData | null>(null)
  const [errMsg, setErrMsg] = useState('')
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all')

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErrMsg(d.error); setState('error'); return }
        setData(d); setState('ok')
      })
      .catch(() => { setErrMsg('Could not load statement'); setState('error') })
  }, [token])

  const base: React.CSSProperties = {
    fontFamily: 'system-ui, sans-serif',
    background: C.bg, color: C.text,
    minHeight: '100dvh', maxWidth: 480, margin: '0 auto',
    padding: '0 0 40px',
  }

  if (state === 'loading') return (
    <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, paddingTop: 0 }}>
      <div style={{ fontSize: 40 }}>💰</div>
      <div style={{ color: C.muted, fontSize: 14 }}>Loading statement…</div>
    </div>
  )

  if (state === 'error') return (
    <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 40 }}>🔒</div>
      <div style={{ fontWeight: 700, fontSize: 16 }}>Link Invalid</div>
      <div style={{ color: C.muted, fontSize: 14, textAlign: 'center', padding: '0 24px' }}>{errMsg}</div>
    </div>
  )

  const { account, transactions, label, generated } = data!
  const isPerson = account.type === 'person'
  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter)
  const totalIn  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalOut = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  // Group by date
  const groups: Record<string, Transaction[]> = {}
  filtered.forEach(t => {
    const key = new Date(t.txn_at).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  })

  const typeColor = (type: string) =>
    type === 'income' ? C.income : type === 'transfer' ? C.transfer : C.expense

  return (
    <div style={base}>
      {/* Header */}
      <div style={{
        background: 'rgba(11,11,24,0.95)', borderBottom: `1px solid ${C.border}`,
        padding: '14px 16px', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '1.4px' }}>FINLEDGER · SHARED STATEMENT</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{account.name}</div>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Summary card */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${account.color}`, borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                {account.type.replace('_', ' ')}
              </div>
              {label && <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>{label}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: isPerson && account.balance > 0 ? C.person : account.balance < 0 ? C.expense : C.accent }}>
                {isPerson && account.balance > 0 ? '+' : ''}{fmt(account.balance)}
              </div>
              {isPerson && (
                <div style={{ fontSize: 11, color: account.balance > 0 ? C.person : account.balance < 0 ? C.expense : C.muted }}>
                  {account.balance > 0 ? 'They owe' : account.balance < 0 ? 'You owe' : 'Settled'}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: 'rgba(16,185,129,.08)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, color: C.income, fontWeight: 700, textTransform: 'uppercase' }}>
                {isPerson ? 'TOTAL LENT' : '↑ TOTAL IN'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.income, fontVariant: 'tabular-nums' }}>{fmt(totalIn)}</div>
            </div>
            <div style={{ background: 'rgba(244,63,94,.08)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, color: C.expense, fontWeight: 700, textTransform: 'uppercase' }}>
                {isPerson ? 'TOTAL RECEIVED' : '↓ TOTAL OUT'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.expense, fontVariant: 'tabular-nums' }}>{fmt(totalOut)}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
            {transactions.length} transactions · Generated {new Date(generated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { v: 'all' as const, l: `All (${transactions.length})` },
            { v: 'income' as const, l: isPerson ? `Lent (${transactions.filter(t => t.type === 'income').length})` : `↑ Income (${transactions.filter(t => t.type === 'income').length})` },
            { v: 'expense' as const, l: isPerson ? `Received (${transactions.filter(t => t.type === 'expense').length})` : `↓ Expense (${transactions.filter(t => t.type === 'expense').length})` },
          ].map(f => (
            <button key={f.v} onClick={() => setFilter(f.v)} style={{
              flex: 1, padding: '8px 4px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: 'system-ui, sans-serif',
              background: filter === f.v ? C.accent : C.card,
              color: filter === f.v ? '#0b0b18' : C.muted,
              outline: filter === f.v ? 'none' : `1px solid ${C.border}`,
            }}>{f.l}</button>
          ))}
        </div>

        {/* Transaction list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: C.muted }}>
            No transactions in this category
          </div>
        ) : (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
            {Object.entries(groups).map(([day, txs], gi) => {
              const dIn  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
              const dOut = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
              return (
                <div key={day}>
                  {gi > 0 && <div style={{ height: 1, background: C.border, margin: '12px 0' }} />}
                  {/* Day header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{day}</span>
                    <span style={{ fontSize: 11 }}>
                      {dIn > 0 && <span style={{ color: C.income }}>+{fmt(dIn)}</span>}
                      {dIn > 0 && dOut > 0 && <span style={{ color: C.muted }}> · </span>}
                      {dOut > 0 && <span style={{ color: C.expense }}>−{fmt(dOut)}</span>}
                    </span>
                  </div>
                  {/* Rows */}
                  {txs.map((t, i) => {
                    const col = typeColor(t.type)
                    const sign = t.type === 'income' ? '+' : t.type === 'transfer' ? '→' : '−'
                    const { date: _d, time } = fmtDT(t.txn_at)
                    const typeLabel = isPerson && t.type === 'income' ? 'LENT' : isPerson && t.type === 'expense' ? 'RECEIVED' : t.type.toUpperCase()
                    return (
                      <div key={t.id}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, marginTop: 1 }}>
                            {catIcon(t.category)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {t.description || t.category}
                            </div>
                            <div style={{ fontSize: 11, color: C.muted }}>
                              <span style={{ color: C.accent, fontWeight: 600 }}>{time}</span>
                            </div>
                            <span style={{
                              display: 'inline-flex', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, marginTop: 3,
                              background: t.type === 'income' ? 'rgba(16,185,129,.15)' : t.type === 'transfer' ? 'rgba(96,165,250,.12)' : 'rgba(244,63,94,.12)',
                              color: col,
                            }}>{typeLabel}</span>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: col, fontVariant: 'tabular-nums' }}>
                              {sign}{fmt(t.amount)}
                            </div>
                          </div>
                        </div>
                        {i < txs.length - 1 && <div style={{ height: 1, background: C.border, margin: '8px 0' }} />}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', color: C.muted, fontSize: 11, paddingTop: 8 }}>
          Powered by <span style={{ color: C.accent, fontWeight: 700 }}>FinLedger</span> · Read-only view
        </div>
      </div>
    </div>
  )
}
