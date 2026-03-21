'use client'
import { use, useState } from 'react'
import { useStore } from '@/store/useStore'
import AppShell from '@/components/layout/AppShell'
import DataProvider from '@/components/layout/DataProvider'
import { ToastProvider } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import TxRow from '@/components/transactions/TxRow'
import TxForm from '@/components/transactions/TxForm'
import AccForm from '@/components/accounts/AccForm'
import { fmt, monthTxs, ccTxs, getCCCycle, fmtShort, daysLeft } from '@/lib/helpers'

function MonthPicker() {
  const { month, setMonth } = useStore()
  return <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 'auto', padding: '6px 11px', fontSize: 11, borderRadius: 20, fontWeight: 600, border: '1px solid var(--color-border)', background: 'var(--color-card)' }} />
}

function AccDetailContent({ id }: { id: string }) {
  const { accounts, transactions, month, loaded } = useStore()
  const [ccOffset, setCcOffset] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const acc = accounts.find(a => a.id === id)

  // Show skeleton while store is hydrating
  if (!loaded || !acc) {
    return (
      <AppShell title="Account" showBack backHref="/accounts">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
          {[120, 60, 80].map((h, i) => (
            <div key={i} style={{
              height: h, borderRadius: 16,
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              animation: 'shimmer 1.4s ease-in-out infinite',
              opacity: 1 - i * 0.15,
            }} />
          ))}
        </div>
        <style>{`
          @keyframes shimmer {
            0%, 100% { opacity: 0.5; }
            50%       { opacity: 1;   }
          }
        `}</style>
      </AppShell>
    )
  }

  const isCC = acc.type === 'credit_card' && acc.billing_day
  const isPerson = acc.type === 'person'

  let txs = isCC ? ccTxs(acc, transactions, ccOffset) : monthTxs(transactions, month).filter(t => t.account_id === acc.id)
  const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return (
    <AppShell title={acc.name} showBack backHref="/accounts" showFab onFab={() => setAddOpen(true)}
      headerRight={!isCC ? <MonthPicker /> : undefined}>
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Header card */}
        <div className="card" style={{ borderLeft: `3px solid ${acc.color}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div className="hd" style={{ fontSize: 18, fontWeight: 800 }}>{acc.name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{acc.type.replace('_', ' ').toUpperCase()}</div>
              {isPerson && <div style={{ fontSize: 12, color: 'var(--color-sub)', marginTop: 4 }}>income = lent · expense = received back</div>}
            </div>
            {isPerson ? (
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: acc.balance > 0 ? 'var(--color-person)' : acc.balance < 0 ? 'var(--color-expense)' : 'var(--color-muted)' }}>
                  {acc.balance > 0 ? '+' : acc.balance < 0 ? '−' : ''}{fmt(Math.abs(acc.balance))}
                </div>
                <div style={{ fontSize: 12, color: acc.balance > 0 ? 'var(--color-person)' : acc.balance < 0 ? 'var(--color-expense)' : 'var(--color-muted)' }}>
                  {acc.balance > 0 ? 'They owe you' : acc.balance < 0 ? 'You owe them' : 'Settled'}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: acc.balance < 0 ? 'var(--color-expense)' : 'var(--color-accent)' }}>{fmt(acc.balance)}</div>
                <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>Balance</div>
              </div>
            )}
          </div>

          {isCC && acc.credit_limit && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600 }}>CYCLE USED</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--color-muted)' }}>{fmt(exp)} / {fmt(acc.credit_limit)}</span>
              </div>
              <div style={{ height: 6, background: 'var(--color-surface)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, exp / acc.credit_limit * 100)}%`, height: '100%', background: exp / acc.credit_limit > 0.8 ? 'var(--color-expense)' : exp / acc.credit_limit > 0.5 ? 'var(--color-warning)' : 'var(--color-income)', borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>Due day {acc.billing_day} · {daysLeft(acc.billing_day!)}d left</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              { label: isPerson ? 'LENT' : '↑ IN', val: inc, col: 'var(--color-income)' },
              { label: isPerson ? 'RECD' : '↓ OUT', val: exp, col: 'var(--color-expense)' },
              { label: 'TXNS', val: txs.length, col: 'var(--color-text)', isCt: true },
            ].map(({ label, val, col, isCt }) => (
              <div key={label} className="card-inset" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: col, fontWeight: 600 }}>{label}</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: col }}>{isCt ? val : fmt(val as number)}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="edbtn" onClick={() => setEditOpen(true)}>✏️ Edit</button>
            <button className="btn btn-primary" onClick={() => setAddOpen(true)} style={{ flex: 2, borderRadius: 10, padding: 9, fontSize: 13 }}>+ Transaction</button>
          </div>
        </div>

        {/* Cycle nav for CC */}
        {isCC && (() => {
          const { start, end } = getCCCycle(acc.billing_day!, ccOffset)
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="pill active" style={{ padding: '6px 12px' }} onClick={() => setCcOffset(p => p - 1)}>‹ Prev</button>
              <span style={{ fontSize: 12, fontWeight: 600, flex: 1, textAlign: 'center', color: 'var(--color-sub)' }}>{fmtShort(start)} – {fmtShort(end)}</span>
              <button className="pill" style={{ padding: '6px 12px', opacity: ccOffset >= 0 ? 0.4 : 1, pointerEvents: ccOffset >= 0 ? 'none' : 'auto' }} onClick={() => setCcOffset(p => Math.min(0, p + 1))}>Next ›</button>
            </div>
          )
        })()}

        {/* Month label for non-CC */}
        {!isCC && (
          <div style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', color: 'var(--color-muted)', padding: '4px 0' }}>
            {new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            {' '}· <span style={{ color: 'var(--color-accent)' }}>change via header</span>
          </div>
        )}

        {/* Transaction list */}
        {txs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 28, color: 'var(--color-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📝</div>No transactions this period
          </div>
        ) : (
          <div className="card">
            <div className="slabel">{txs.length} Transaction{txs.length !== 1 ? 's' : ''}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {txs.map((t, i) => (
                <div key={t.id}>
                  <TxRow tx={t} showAccount={false} isPerson={isPerson} />
                  {i < txs.length - 1 && <div className="sep" style={{ margin: '8px 0' }} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)}>
        <TxForm preAccId={acc.id} onDone={() => setAddOpen(false)} />
      </Modal>
      <Modal open={editOpen} onClose={() => setEditOpen(false)}>
        <AccForm acc={acc} onDone={() => setEditOpen(false)} />
      </Modal>
    </AppShell>
  )
}

export default function AccDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <ToastProvider>
      <DataProvider>
        <AccDetailContent id={id} />
      </DataProvider>
    </ToastProvider>
  )
}
