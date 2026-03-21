'use client'
import { useStore } from '@/store/useStore'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import DataProvider from '@/components/layout/DataProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { fmt, fmtDate, monthTxs, ccTxs, getCCCycle, daysLeft, catIcon } from '@/lib/helpers'

function MonthPicker() {
  const { month, setMonth } = useStore()
  return <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 'auto', padding: '6px 11px', fontSize: 11, borderRadius: 20, fontWeight: 600, border: '1px solid var(--color-border)', background: 'var(--color-card)' }} />
}

function ReportsContent() {
  const { accounts, transactions, month } = useStore()
  const router = useRouter()
  const mLabel = new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const ccAccs = accounts.filter(a => a.type === 'credit_card' && a.billing_day)
  const personAccs = accounts.filter(a => a.type === 'person')

  return (
    <AppShell title="Reports" headerRight={<MonthPicker />}>
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* CC billing cycles */}
        {ccAccs.length > 0 && (
          <>
            <div className="slabel">💳 Credit Card Billing Cycles</div>
            {ccAccs.map(a => {
              const { start, end } = getCCCycle(a.billing_day!, 0)
              const cyTxs = ccTxs(a, transactions, 0)
              const cyExp = cyTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
              const dl = daysLeft(a.billing_day!)
              const usage = a.credit_limit ? Math.min(100, cyExp / a.credit_limit * 100) : 0
              const bc = usage > 80 ? 'var(--color-expense)' : usage > 50 ? 'var(--color-warning)' : 'var(--color-income)'
              const catMap: Record<string, number> = {}
              cyTxs.filter(t => t.type === 'expense').forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount })
              const top = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 4)
              return (
                <div key={a.id} className="card" style={{ borderLeft: `3px solid ${a.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div className="hd" style={{ fontSize: 15, fontWeight: 700 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{fmtDate(start)} → {fmtDate(end)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-expense)' }}>{fmt(cyExp)}</div>
                      <div style={{ fontSize: 11, color: dl <= 5 ? 'var(--color-expense)' : 'var(--color-muted)' }}>Due day {a.billing_day} · {dl}d</div>
                    </div>
                  </div>
                  {a.credit_limit && (
                    <>
                      <div style={{ height: 5, background: 'var(--color-surface)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
                        <div style={{ width: `${usage}%`, height: '100%', background: bc, borderRadius: 3 }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 10 }}>{usage.toFixed(0)}% · {fmt(a.credit_limit - cyExp)} remaining</div>
                    </>
                  )}
                  {top.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {top.map(([cat, amt]) => (
                        <div key={cat} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13 }}>{catIcon(cat)} {cat}</span>
                          <span className="mono" style={{ fontSize: 13, color: 'var(--color-expense)' }}>{fmt(amt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button className="edbtn" style={{ width: '100%', marginTop: 10 }} onClick={() => router.push(`/accounts/${a.id}`)}>View Transactions →</button>
                </div>
              )
            })}
          </>
        )}

        {/* People summary */}
        {personAccs.length > 0 && (
          <>
            <div className="slabel">🤝 People Summary</div>
            <div className="card">
              {personAccs.filter(a => a.balance > 0).length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--color-person)', fontWeight: 600, marginBottom: 6 }}>OWE YOU</div>
                  {personAccs.filter(a => a.balance > 0).map(a => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</span>
                      <span className="mono" style={{ fontSize: 14, color: 'var(--color-person)' }}>+{fmt(a.balance)}</span>
                    </div>
                  ))}
                </div>
              )}
              {personAccs.filter(a => a.balance < 0).length > 0 && (
                <>
                  {personAccs.filter(a => a.balance > 0).length > 0 && <div className="sep" style={{ margin: '8px 0' }} />}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--color-expense)', fontWeight: 600, marginBottom: 6 }}>YOU OWE</div>
                    {personAccs.filter(a => a.balance < 0).map(a => (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</span>
                        <span className="mono" style={{ fontSize: 14, color: 'var(--color-expense)' }}>{fmt(Math.abs(a.balance))}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {personAccs.filter(a => a.balance === 0).length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>✅ Settled: {personAccs.filter(a => a.balance === 0).map(a => a.name).join(', ')}</div>
              )}
            </div>
          </>
        )}

        {/* Monthly per account */}
        <div className="slabel">📊 Monthly · {mLabel}</div>
        {accounts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--color-muted)' }}>Add accounts to see reports</div>
        ) : (
          accounts.map(a => {
            const txs = monthTxs(transactions, month).filter(t => t.account_id === a.id)
            if (!txs.length) return null
            const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
            const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
            const net = inc - exp
            return (
              <div key={a.id} className="card" style={{ borderLeft: `3px solid ${a.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div className="hd" style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</div>
                  <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: net >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>{net >= 0 ? '+' : ''}{fmt(net)}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div className="card-inset" style={{ textAlign: 'center' }}><div style={{ fontSize: 9, color: 'var(--color-income)', fontWeight: 600 }}>IN</div><div className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-income)' }}>{fmt(inc)}</div></div>
                  <div className="card-inset" style={{ textAlign: 'center' }}><div style={{ fontSize: 9, color: 'var(--color-expense)', fontWeight: 600 }}>OUT</div><div className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-expense)' }}>{fmt(exp)}</div></div>
                  <div className="card-inset" style={{ textAlign: 'center' }}><div style={{ fontSize: 9, color: 'var(--color-muted)', fontWeight: 600 }}>TXNS</div><div className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{txs.length}</div></div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </AppShell>
  )
}

export default function ReportsPage() {
  return (
    <ToastProvider>
      <DataProvider>
        <ReportsContent />
      </DataProvider>
    </ToastProvider>
  )
}
