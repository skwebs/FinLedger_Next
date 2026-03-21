'use client'
import { useState } from 'react'
import { useStore } from '@/store/useStore'
import AppShell from '@/components/layout/AppShell'
import DataProvider from '@/components/layout/DataProvider'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { fmt, buildTxnAt, nowDate } from '@/lib/helpers'
import { CATS } from '@/lib/constants'
import type { TxType, ImportRow } from '@/lib/types'

type Step = 'idle' | 'extracting' | 'review' | 'saving' | 'done'

function BotContent() {
  const { accounts, addTransaction } = useStore()
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('idle')
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem('fl_anth_key') || '' } catch { return '' }
  })
  const [rawText, setRawText] = useState('')
  const [selAcc, setSelAcc] = useState(accounts[0]?.id || '')
  const [expenses, setExpenses] = useState<ImportRow[]>([])
  const [logs, setLogs] = useState<{ t: string; msg: string }[]>([])
  const [err, setErr] = useState('')

  function addLog(msg: string) {
    const t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLogs(p => [...p, { t, msg }])
  }

  async function extract() {
    if (!apiKey) { setErr('Enter your Anthropic API key'); return }
    if (!rawText.trim()) { setErr('Paste some bank SMS or email text'); return }
    if (!accounts.length) { setErr('Add at least one account first'); return }
    try { localStorage.setItem('fl_anth_key', apiKey) } catch { /**/ }
    setErr(''); setLogs([]); setStep('extracting')
    addLog('🤖 Sending to Claude AI…')
    try {
      const resp = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'API error')
      addLog(`✅ Extracted ${data.transactions?.length || 0} transaction(s)`)
      const parsed: ImportRow[] = (data.transactions || []).map((e: Record<string, unknown>, i: number) => ({
        _id: 'b' + i, _sel: true,
        amount: Math.abs(parseFloat(String(e.amount)) || 0),
        type: (['expense', 'income', 'transfer'].includes(String(e.type)) ? e.type : 'expense') as TxType,
        category: CATS.includes(String(e.category)) ? String(e.category) : 'Other',
        description: String(e.description || '').trim() || 'Transaction',
        date: String(e.date || nowDate()),
        time: String(e.time || '12:00'),
        accId: selAcc,
      })).filter((r: ImportRow) => r.amount > 0)
      setExpenses(parsed)
      setStep('review')
    } catch (e: unknown) {
      addLog('❌ ' + (e instanceof Error ? e.message : 'Failed'))
      setErr(e instanceof Error ? e.message : 'Failed')
      setStep('idle')
    }
  }

  async function save() {
    const toSave = expenses.filter(r => r._sel)
    if (!toSave.length) { toast('Select at least one', 'err'); return }
    setLogs([]); setStep('saving')
    let ok = 0, fail = 0
    for (const r of toSave) {
      try {
        await addTransaction({ account_id: r.accId, amount: r.amount, type: r.type, category: r.category, description: r.description, txn_at: buildTxnAt(r.date, r.time), to_account_id: null })
        addLog(`  ✅ ${r.description} — ${fmt(r.amount)}`); ok++
      } catch { addLog(`  ❌ ${r.description}`); fail++ }
    }
    addLog(`🎉 Done! ${ok} saved${fail ? `, ${fail} failed` : ''}`)
    setStep('done')
  }

  const steps: Step[] = ['idle', 'extracting', 'review', 'saving', 'done']
  const cur = steps.indexOf(step)

  return (
    <AppShell title="📧 Email Bot" showFab={false}>
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 4 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: i === cur ? 'var(--color-accent)' : i < cur ? 'rgba(245,158,11,.35)' : 'var(--color-border)' }} />
          ))}
        </div>

        {(step === 'idle' || step === 'extracting') && (
          <>
            <div className="card" style={{ background: 'linear-gradient(135deg,#1a1a38,#1a2038)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28 }}>📧</span>
                <div>
                  <div className="hd" style={{ fontSize: 16, fontWeight: 800 }}>Email / SMS Bot</div>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>Paste bank SMS or email · AI extracts transactions</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="slabel">🔑 Anthropic API Key</div>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-ant-…" style={{ marginBottom: 5 }} />
              <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>console.anthropic.com → API Keys (free credits on signup)</div>
            </div>

            <div className="card">
              <div className="slabel">📋 Paste Bank SMS / Email Text</div>
              <textarea value={rawText} onChange={e => setRawText(e.target.value)} rows={7}
                style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 12, color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 13, padding: '12px 14px', width: '100%', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }}
                placeholder="Paste any text — bank SMSes, UPI alerts, credit card notifications, email bodies…" />
            </div>

            <div className="card">
              <label>Save To Account</label>
              <select value={selAcc} onChange={e => setSelAcc(e.target.value)}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            {err && <div style={{ background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.3)', borderRadius: 10, padding: '10px 13px', fontSize: 13, color: 'var(--color-expense)' }}>❌ {err}</div>}

            <button className="btn btn-primary" onClick={extract} disabled={step === 'extracting'}>
              {step === 'extracting' ? <><span className="spinner" />  Extracting…</> : '🤖 Extract Transactions with AI'}
            </button>

            {step === 'extracting' && logs.length > 0 && (
              <div className="card">
                {logs.map((l, i) => <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12 }}><span className="mono" style={{ color: 'var(--color-faint)', flexShrink: 0 }}>{l.t}</span><span style={{ color: 'var(--color-sub)' }}>{l.msg}</span></div>)}
              </div>
            )}

            <div className="card" style={{ background: 'rgba(245,158,11,.04)', borderColor: 'rgba(245,158,11,.15)' }}>
              <div className="slabel" style={{ color: 'var(--color-accent)' }}>How it works</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13, color: 'var(--color-sub)' }}>
                <div>1️⃣ Paste any SMS, email, UPI alert</div>
                <div>2️⃣ AI extracts amount, merchant, category</div>
                <div>3️⃣ Review and edit before saving</div>
                <div>4️⃣ One tap saves to Supabase</div>
              </div>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <div className="card" style={{ background: 'linear-gradient(135deg,#1a1a38,#20203c)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div><div className="slabel" style={{ padding: 0 }}>Selected</div><div className="mono" style={{ fontSize: 20, fontWeight: 800 }}>{expenses.filter(r => r._sel).length}<span style={{ fontSize: 13, color: 'var(--color-muted)' }}>/{expenses.length}</span></div></div>
                <div style={{ textAlign: 'right' }}><div className="slabel" style={{ padding: 0 }}>Expense</div><div className="mono" style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-accent)' }}>{fmt(expenses.filter(r => r._sel && r.type === 'expense').reduce((s, r) => s + r.amount, 0))}</div></div>
              </div>
              <div><label>Save To</label><select value={selAcc} onChange={e => { setSelAcc(e.target.value); setExpenses(p => p.map(r => ({ ...r, accId: e.target.value }))) }}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select></div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-sm" onClick={() => setExpenses(p => p.map(r => ({ ...r, _sel: true })))} style={{ background: 'rgba(16,185,129,.15)', color: 'var(--color-income)' }}>All</button>
              <button className="btn-sm" onClick={() => setExpenses(p => p.map(r => ({ ...r, _sel: false })))} style={{ background: 'var(--color-surface)', color: 'var(--color-muted)' }}>None</button>
            </div>

            {expenses.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--color-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🤷</div>No transactions found
                <button className="btn btn-ghost" onClick={() => setStep('idle')} style={{ marginTop: 14, width: 'auto', padding: '9px 24px' }}>← Try Again</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {expenses.map((e, idx) => {
                  const col = e.type === 'income' ? 'var(--color-income)' : e.type === 'transfer' ? 'var(--color-transfer)' : 'var(--color-expense)'
                  return (
                    <div key={e._id} style={{ background: 'var(--color-card)', border: `1px solid ${e._sel ? col : 'var(--color-border)'}`, borderLeft: `3px solid ${col}`, borderRadius: 16, padding: 14, opacity: e._sel ? 1 : 0.5, transition: 'all .2s' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <button onClick={() => setExpenses(p => p.map((x, i) => i === idx ? { ...x, _sel: !x._sel } : x))} style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${e._sel ? 'var(--color-accent)' : 'var(--color-border)'}`, background: e._sel ? 'rgba(245,158,11,.15)' : 'none', color: 'var(--color-accent)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', padding: 0 }}>{e._sel ? '✓' : ''}</button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span className={`badge badge-${e.type}`}>{e.type.toUpperCase()}</span>
                            <span className="mono" style={{ fontSize: 16, fontWeight: 800, color: col }}>{e.type === 'income' ? '+' : '−'}{fmt(e.amount)}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            <input value={e.description} onChange={ev => setExpenses(p => p.map((x, i) => i === idx ? { ...x, description: ev.target.value } : x))} placeholder="Description" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 9, color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 13, padding: '9px 12px', width: '100%', outline: 'none', boxSizing: 'border-box' }} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                              <select value={e.type} onChange={ev => setExpenses(p => p.map((x, i) => i === idx ? { ...x, type: ev.target.value as TxType } : x))} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 9, color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 12, padding: '9px 10px', outline: 'none', width: '100%' }}>
                                <option value="expense">↓ Expense</option>
                                <option value="income">↑ Income</option>
                                <option value="transfer">→ Transfer</option>
                              </select>
                              <select value={e.category} onChange={ev => setExpenses(p => p.map((x, i) => i === idx ? { ...x, category: ev.target.value } : x))} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 9, color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 12, padding: '9px 10px', outline: 'none', width: '100%' }}>
                                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                              <input type="date" value={e.date} onChange={ev => setExpenses(p => p.map((x, i) => i === idx ? { ...x, date: ev.target.value } : x))} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 9, color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 12, padding: '9px 10px', outline: 'none', width: '100%', colorScheme: 'dark' }} />
                              <input type="time" value={e.time} onChange={ev => setExpenses(p => p.map((x, i) => i === idx ? { ...x, time: ev.target.value } : x))} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 9, color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 12, padding: '9px 10px', outline: 'none', width: '100%', colorScheme: 'dark' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => setExpenses(p => p.filter((_, i) => i !== idx))} style={{ width: '100%', marginTop: 10, background: 'rgba(244,63,94,.08)', border: '1px solid rgba(244,63,94,.2)', borderRadius: 9, color: 'var(--color-expense)', padding: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>🗑️ Remove</button>
                    </div>
                  )
                })}
              </div>
            )}

            {expenses.length > 0 && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => setStep('idle')} style={{ flex: 1 }}>← Back</button>
                <button className="btn btn-primary" onClick={save} disabled={!expenses.some(r => r._sel)} style={{ flex: 2 }}>💾 Save {expenses.filter(r => r._sel).length}</button>
              </div>
            )}
          </>
        )}

        {(step === 'saving' || step === 'done') && (
          <>
            {step === 'done' && (
              <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <div className="hd" style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-income)', marginBottom: 6 }}>Import Complete!</div>
              </div>
            )}
            {step === 'done' && (
              <button className="btn btn-primary" onClick={() => { setStep('idle'); setExpenses([]); setLogs([]); setRawText('') }}>🔄 Extract More</button>
            )}
            <div className="card">
              <div className="slabel">{step === 'saving' ? 'Saving…' : 'Activity Log'}</div>
              {logs.length === 0 ? <span className="spinner" /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                  {logs.map((l, i) => <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12 }}><span className="mono" style={{ color: 'var(--color-faint)', flexShrink: 0 }}>{l.t}</span><span style={{ color: 'var(--color-sub)' }}>{l.msg}</span></div>)}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

export default function BotPage() {
  return (
    <ToastProvider>
      <DataProvider>
        <BotContent />
      </DataProvider>
    </ToastProvider>
  )
}
