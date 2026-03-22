'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import AppShell from '@/components/layout/AppShell'
import DataProvider from '@/components/layout/DataProvider'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import TxForm from '@/components/transactions/TxForm'
import TxRow from '@/components/transactions/TxRow'
import { fmt, monthTxs, ccTxs, catIcon } from '@/lib/helpers'
import { ACC_TYPES, GROUP_ORDER } from '@/lib/constants'

function MonthPicker() {
  const { month, setMonth } = useStore()
  return (
    <input type="month" value={month} onChange={e => setMonth(e.target.value)}
      style={{ width:'auto', padding:'6px 11px', fontSize:11, borderRadius:20, fontWeight:600, border:'1px solid var(--color-border)', background:'var(--color-card)' }} />
  )
}

function DashboardContent() {
  const { accounts, transactions, month } = useStore()
  const [addOpen, setAddOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('email_changed') === '1') {
        toast('Email updated successfully!', 'ok')
        window.history.replaceState({}, '', '/dashboard')
      }
    }
  }, [])

  const txs = monthTxs(transactions, month)
  const realAccounts = accounts.filter(a => a.type !== 'person')
  const personAccounts = accounts.filter(a => a.type === 'person')
  const totalBal = realAccounts.reduce((s, a) => s + a.balance, 0)
  const owed  = personAccounts.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0)
  const owing = personAccounts.filter(a => a.balance < 0).reduce((s, a) => s + Math.abs(a.balance), 0)
  const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const mLabel = new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const catMap: Record<string, number> = {}
  txs.filter(t => t.type === 'expense').forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount })
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <AppShell title="Dashboard" showFab onFab={() => setAddOpen(true)}
      headerRight={<MonthPicker />}>
      <div className="fade-up" style={{ display:'flex', flexDirection:'column', gap:14 }}>

        {/* Net worth */}
        <div className="card" style={{ background:'linear-gradient(135deg,#1a1a38,#1e1e40)', textAlign:'center', padding:'22px 16px' }}>
          <div className="slabel" style={{ textAlign:'center' }}>NET WORTH (REAL ACCOUNTS)</div>
          <div className="mono" style={{ fontSize:36, fontWeight:700, color:totalBal >= 0 ? 'var(--color-accent)' : 'var(--color-expense)' }}>{fmt(totalBal)}</div>
          <div style={{ fontSize:12, color:'var(--color-muted)', marginTop:4 }}>{mLabel}</div>
          {personAccounts.length > 0 && (
            <div style={{ display:'flex', justifyContent:'center', gap:20, marginTop:12, paddingTop:12, borderTop:'1px solid var(--color-border)' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--color-person)', fontWeight:600 }}>OWED TO YOU</div>
                <div className="mono" style={{ fontSize:14, fontWeight:700, color:'var(--color-person)' }}>{fmt(owed)}</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--color-muted)', fontWeight:600 }}>YOU OWE</div>
                <div className="mono" style={{ fontSize:14, fontWeight:700, color:'var(--color-sub)' }}>{fmt(owing)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {[{l:'↑ IN',v:income,c:'var(--color-income)'},{l:'↓ OUT',v:expense,c:'var(--color-expense)'},{l:'SAVED',v:income-expense,c:income-expense>=0?'var(--color-income)':'var(--color-expense)'}].map(({l,v,c})=>(
            <div key={l} className="card" style={{ textAlign:'center', padding:'12px 6px' }}>
              <div style={{ fontSize:10, color:c, fontWeight:600, marginBottom:5 }}>{l}</div>
              <div className="mono" style={{ fontSize:14, fontWeight:700, color:c }}>{fmt(v)}</div>
            </div>
          ))}
        </div>

        {/* Account overview */}
        {accounts.length > 0 ? (
          <div className="card">
            <div className="slabel">ACCOUNTS OVERVIEW</div>
            {GROUP_ORDER.map(grpKey => {
              const accs = accounts.filter(a => a.type === grpKey)
              if (!accs.length) return null
              const at = ACC_TYPES.find(t => t.group === grpKey)!
              let sumStr = ''
              if (grpKey === 'credit_card') {
                const total = accs.reduce((s,a)=>s+ccTxs(a,transactions,0).filter(t=>t.type==='expense').reduce((ss,t)=>ss+t.amount,0),0)
                sumStr = `${fmt(total)} cycle`
              } else if (grpKey === 'person') {
                const net = accs.reduce((s,a)=>s+a.balance,0)
                sumStr = net>=0 ? `Owed: ${fmt(net)}` : `Owe: ${fmt(Math.abs(net))}`
              } else {
                sumStr = fmt(accs.reduce((s,a)=>s+a.balance,0))
              }
              return (
                <button key={grpKey} onClick={() => router.push('/accounts')}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderTop:'1px solid var(--color-border)', width:'100%', background:'none', border:'none', borderTopWidth:1, borderTopStyle:'solid', borderTopColor:'var(--color-border)', cursor:'pointer', fontFamily:'var(--font-sans)' }}>
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--color-sub)' }}>{at.groupLabel} ({accs.length})</span>
                  <span className="mono" style={{ fontSize:13, color:at.groupColor }}>{sumStr}</span>
                </button>
              )
            })}
            <button className="btn btn-ghost" onClick={() => router.push('/accounts')} style={{ fontSize:13, padding:9, marginTop:8, width:'100%' }}>View All Accounts →</button>
          </div>
        ) : (
          <div className="card" style={{ textAlign:'center', padding:28 }}>
            <div style={{ fontSize:36, marginBottom:8 }}>🏦</div>
            <div className="hd" style={{ fontWeight:700, marginBottom:6 }}>No Accounts Yet</div>
            <p style={{ color:'var(--color-sub)', fontSize:13, marginBottom:16 }}>Add accounts to start tracking.</p>
            <button className="btn btn-primary" onClick={() => router.push('/accounts')} style={{ width:'auto', padding:'10px 28px' }}>+ Add Account</button>
          </div>
        )}

        {/* Top spending */}
        {topCats.length > 0 && (
          <div className="card">
            <div className="slabel">TOP SPENDING · {mLabel}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {topCats.map(([cat,amt]) => (
                <div key={cat}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:14, fontWeight:500 }}>{catIcon(cat)} {cat}</span>
                    <span className="mono" style={{ fontSize:14, color:'var(--color-expense)' }}>{fmt(amt)}</span>
                  </div>
                  <div style={{ height:4, background:'var(--color-surface)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ width:`${expense>0?(amt/expense*100).toFixed(1):0}%`, height:'100%', background:'var(--color-accent)', borderRadius:2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent */}
        {txs.slice(0,8).length > 0 && (
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span className="slabel" style={{ padding:0 }}>RECENT TRANSACTIONS</span>
              <span style={{ fontSize:12, color:'var(--color-accent)', cursor:'pointer', fontWeight:600 }} onClick={() => router.push('/transactions')}>See All →</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {txs.slice(0,8).map((t,i,arr) => (
                <div key={t.id}>
                  <TxRow tx={t} showAccount />
                  {i < arr.length-1 && <div className="sep" style={{ margin:'8px 0' }} />}
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
