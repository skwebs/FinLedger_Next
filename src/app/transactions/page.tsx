'use client'
import { useState, useRef } from 'react'
import { useStore } from '@/store/useStore'
import AppShell from '@/components/layout/AppShell'
import DataProvider from '@/components/layout/DataProvider'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import TxRow from '@/components/transactions/TxRow'
import TxForm from '@/components/transactions/TxForm'
import { fmt, fmtDT, catIcon, buildTxnAt, nowDate, nowTime } from '@/lib/helpers'
import { CATS } from '@/lib/constants'
import type { TxType, ImportRow } from '@/lib/types'

import FilterPills from '@/components/ui/FilterPills'

type Filter = 'all' | 'expense' | 'income' | 'transfer'

// ─── Export ──────────────────────────────────────
function useExport() {
  const { accounts, transactions } = useStore()
  function buildRows(accFilter: string) {
    const txns = accFilter === 'all' ? transactions : transactions.filter(t => t.account_id === accFilter)
    const headers = ['Date', 'Time', 'Description', 'Amount', 'Type', 'Category', 'Account', 'To Account']
    const rows = txns.map(t => {
      const acc = accounts.find(a => a.id === t.account_id)
      const toAcc = t.to_account_id ? accounts.find(a => a.id === t.to_account_id) : null
      const dt = new Date(t.txn_at || t.created_at)
      return [
        dt.toISOString().slice(0, 10),
        dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
        t.description || '', t.amount, t.type, t.category || 'Other',
        acc?.name || '', toAcc?.name || '',
      ]
    })
    return { headers, rows }
  }
  function exportCSV(accFilter: string) {
    const { headers, rows } = buildRows(accFilter)
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const accName = accFilter === 'all' ? 'all' : (accounts.find(a => a.id === accFilter)?.name || 'account').replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `finledger_${accName}_${nowDate()}.csv`
    a.click(); URL.revokeObjectURL(a.href)
  }
  async function exportXLSX(accFilter: string) {
    const XLSX = (await import('xlsx')).default
    const { headers, rows } = buildRows(accFilter)
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 20 }, { wch: 20 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions')
    const accName = accFilter === 'all' ? 'all' : (accounts.find(a => a.id === accFilter)?.name || 'account').replace(/[^a-z0-9]/gi, '_').toLowerCase()
    XLSX.writeFile(wb, `finledger_${accName}_${nowDate()}.xlsx`)
  }
  return { exportCSV, exportXLSX }
}

function ExportModal({ onClose }: { onClose: () => void }) {
  const { accounts } = useStore()
  const { toast } = useToast()
  const { exportCSV, exportXLSX } = useExport()
  const [accFilter, setAccFilter] = useState('all')

  const btnPrimary: React.CSSProperties = { display: 'block', width: '100%', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, padding: '13px 20px', background: 'var(--color-accent)', color: '#0b0b18', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'center' }
  const btnGhost: React.CSSProperties = { display: 'block', width: '100%', border: '1.5px solid var(--color-border)', borderRadius: 12, fontWeight: 700, fontSize: 15, padding: '13px 20px', background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'center' }

  return (
    <div>
      <h3 className="hd" style={{ fontSize: 18, marginBottom: 14 }}>Export Transactions</h3>
      <div style={{ marginBottom: 14 }}>
        <label>Account</label>
        <select value={accFilter} onChange={e => setAccFilter(e.target.value)}>
          <option value="all">All Accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button style={btnPrimary} onClick={() => { exportCSV(accFilter); onClose(); toast('CSV exported', 'ok') }}>📄 Export as CSV</button>
        <button style={btnGhost} onClick={() => { exportXLSX(accFilter); onClose(); toast('Excel exported', 'ok') }}>📊 Export as Excel</button>
      </div>
      <div style={{ background: 'var(--color-surface)', borderRadius: 10, padding: '11px 13px', fontSize: 12, color: 'var(--color-muted)', marginTop: 14, lineHeight: 1.7 }}>
        Columns: Date · Time · Description · Amount · Type · Category · Account · To Account<br />
        <span style={{ color: 'var(--color-faint)' }}>To Account only filled for Transfer transactions</span>
      </div>
      <button style={{ ...btnGhost, marginTop: 12 }} onClick={onClose}>Cancel</button>
    </div>
  )
}

// ─── Import ───────────────────────────────────────
const COL_KEYS = {
  date: ['date', 'txn_date', 'transaction_date', 'value_date', 'posting_date', 'tran_date', 'dt'],
  time: ['time', 'txn_time', 'transaction_time'],
  desc: ['description', 'desc', 'narration', 'particulars', 'remarks', 'merchant', 'payee'],
  amount: ['amount', 'amt', 'inr', 'rs'],
  debit: ['debit', 'dr', 'debit_amount', 'withdrawal'],
  credit: ['credit', 'cr', 'credit_amount', 'deposit'],
  type: ['type', 'txn_type', 'transaction_type'],
  category: ['category', 'cat', 'tag'],
  account: ['account', 'account_name', 'acc'],
}

function detectDate(raw: string): string {
  if (!raw) return nowDate()
  const p = [
    { re: /^(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})$/, fn: (_: string, d: string, m: string, y: string) => `${y}-${m}-${d}` },
    { re: /^(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})$/, fn: (_: string, y: string, m: string, d: string) => `${y}-${m}-${d}` },
    { re: /^(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})$/, fn: (_: string, d: string, m: string, y: string) => `20${y}-${m}-${d}` },
  ]
  for (const { re, fn } of p) { const mx = raw.match(re); if (mx) return fn(...mx as [string, string, string, string]) }
  try { const d = new Date(raw); if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10) } catch { /**/ }
  return nowDate()
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const { accounts, addTransaction } = useStore()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'pick' | 'map' | 'review' | 'saving'>('pick')
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [mapped, setMapped] = useState<Record<string, number>>({})
  const [parsed, setParsed] = useState<ImportRow[]>([])
  const [selAcc, setSelAcc] = useState(accounts[0]?.id || '')
  const [logs, setLogs] = useState<string[]>([])

  async function handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    let rows: string[][] = []
    if (ext === 'csv') {
      const text = (await file.text()).replace(/^\uFEFF/, '')
      const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean)
      rows = lines.map(line => {
        const row: string[] = []; let cell = ''; let inQ = false
        for (let i = 0; i < line.length; i++) {
          const c = line[i]
          if (c === '"') { if (inQ && line[i + 1] === '"') { cell += '"'; i++ } else inQ = !inQ }
          else if (c === ',' && !inQ) { row.push(cell.trim()); cell = '' }
          else cell += c
        }
        row.push(cell.trim()); return row
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const XLSX = (await import('xlsx')).default
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      rows = (XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) as string[][]).filter(r => r.some(c => String(c).trim()))
    } else { toast('Use CSV or XLSX', 'err'); return }
    if (rows.length < 2) { toast('File has no data', 'err'); return }
    setRawRows(rows)
    const headers = rows[0].map(h => String(h).toLowerCase().trim().replace(/\s+/g, '_'))
    const find = (keys: string[]) => { for (const k of keys) { const i = headers.findIndex(h => k === h || h.includes(k) || k.includes(h)); if (i >= 0) return i } return -1 }
    const m: Record<string, number> = {}
    Object.entries(COL_KEYS).forEach(([key, vals]) => { m[key] = find(vals) })
    setMapped(m)
    setStep('map')
  }

  function doParse() {
    const m = mapped
    const data = rawRows.slice(1).filter(r => r.some(c => String(c).trim())).map((row, i) => {
      const getAmt = (col: number) => Math.abs(parseFloat(String(row[col] || '').replace(/[^0-9.-]/g, '')) || 0)
      let amount = 0, type: TxType = 'expense'
      if (m.debit >= 0 || m.credit >= 0) {
        const d = m.debit >= 0 ? getAmt(m.debit) : 0; const c = m.credit >= 0 ? getAmt(m.credit) : 0
        amount = d > 0 ? d : c; type = d > 0 ? 'expense' : 'income'
      } else if (m.amount >= 0) { amount = getAmt(m.amount) }
      if (m.type >= 0 && amount > 0) {
        const tv = String(row[m.type] || '').toLowerCase()
        if (tv.includes('credit') || tv.includes('income')) type = 'income'
        else if (tv.includes('debit') || tv.includes('expense')) type = 'expense'
        else if (tv.includes('transfer')) type = 'transfer'
        else if (['expense', 'income', 'transfer'].includes(tv)) type = tv as TxType
      }
      const date = detectDate(m.date >= 0 ? String(row[m.date] || '') : '')
      const time = m.time >= 0 ? String(row[m.time] || '12:00').slice(0, 5) : '12:00'
      const desc = m.desc >= 0 ? String(row[m.desc] || '').trim() : 'Transaction'
      const cat = m.category >= 0 && CATS.includes(String(row[m.category])) ? String(row[m.category]) : 'Other'
      let accId = selAcc
      if (m.account >= 0) { const nm = String(row[m.account] || '').toLowerCase(); const found = accounts.find(a => a.name.toLowerCase() === nm); if (found) accId = found.id }
      return { _id: 'i' + i, _sel: amount > 0, amount, type, date, time, description: desc || 'Transaction', category: cat, accId }
    }).filter(r => r.amount > 0)
    setParsed(data); setStep('review')
  }

  async function doSave() {
    const toSave = parsed.filter(r => r._sel)
    if (!toSave.length) { toast('Select at least one row', 'err'); return }
    setStep('saving'); const ls: string[] = []
    let ok = 0, fail = 0
    for (const r of toSave) {
      try {
        await addTransaction({ account_id: r.accId, amount: r.amount, type: r.type, category: r.category, description: r.description, txn_at: buildTxnAt(r.date, r.time), to_account_id: null })
        ls.push(`✅ ${r.description} — ${fmt(r.amount)}`); ok++
      } catch { ls.push(`❌ ${r.description}`); fail++ }
    }
    ls.push(''); ls.push(`🎉 Done! ${ok} imported${fail ? `, ${fail} failed` : ''}`)
    setLogs(ls)
    toast(`Imported ${ok}${fail ? `, ${fail} failed` : ''}`, ok > 0 ? 'ok' : 'err')
  }

  const headers = rawRows[0] || []

  const btnP: React.CSSProperties = { display: 'block', width: '100%', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, padding: '13px 20px', background: 'var(--color-accent)', color: '#0b0b18', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'center' }
  const btnG: React.CSSProperties = { display: 'block', width: '100%', border: '1.5px solid var(--color-border)', borderRadius: 12, fontWeight: 700, fontSize: 15, padding: '13px 20px', background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'center' }
  const btnSm: React.CSSProperties = { border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, padding: '7px 13px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }

  return (
    <div>
      <h3 className="hd" style={{ fontSize: 18, marginBottom: 14 }}>Import Transactions</h3>

      {step === 'pick' && (
        <>
          <label htmlFor="imp-file" style={{ display: 'block', border: '2px dashed var(--color-border)', borderRadius: 14, padding: '28px 16px', textAlign: 'center', cursor: 'pointer', marginBottom: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Tap to choose file</div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>CSV, XLSX, XLS</div>
          </label>
          <input id="imp-file" type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} ref={fileRef} />
          <div><label>Default Account</label>
            <select value={selAcc} onChange={e => setSelAcc(e.target.value)} style={{ marginBottom: 14 }}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <button style={btnG} onClick={onClose}>Cancel</button>
        </>
      )}

      {step === 'map' && (
        <>
          <p style={{ color: 'var(--color-sub)', fontSize: 13, marginBottom: 14 }}>{rawRows.length - 1} row(s) found. Verify column mapping.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {Object.entries(COL_KEYS).slice(0, 8).map(([key]) => (
              <div key={key}>
                <label>{key}</label>
                <select value={mapped[key] ?? -1} onChange={e => setMapped(p => ({ ...p, [key]: parseInt(e.target.value) }))} style={{ padding: '8px 10px', fontSize: 12 }}>
                  <option value={-1}>— none —</option>
                  {headers.map((h, i) => <option key={i} value={i}>{h || 'col_' + i}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div><label>Default Account</label>
            <select value={selAcc} onChange={e => setSelAcc(e.target.value)} style={{ marginBottom: 14 }}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ ...btnG, flex: 1 }} onClick={() => setStep('pick')}>← Back</button>
            <button style={{ ...btnP, flex: 2 }} onClick={doParse}>Preview Rows →</button>
          </div>
        </>
      )}

      {step === 'review' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div><span className="slabel" style={{ padding: 0 }}>Selected</span><div className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{parsed.filter(r => r._sel).length}<span style={{ fontSize: 12, color: 'var(--color-muted)' }}>/{parsed.length}</span></div></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{ ...btnSm, background: 'rgba(16,185,129,.15)', color: 'var(--color-income)' }} onClick={() => setParsed(p => p.map(r => ({ ...r, _sel: true })))}>All</button>
              <button style={{ ...btnSm, background: 'var(--color-surface)', color: 'var(--color-muted)' }} onClick={() => setParsed(p => p.map(r => ({ ...r, _sel: false })))}>None</button>
            </div>
          </div>
          <div style={{ maxHeight: '45dvh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {parsed.map((r, idx) => {
              const col = r.type === 'income' ? 'var(--color-income)' : r.type === 'transfer' ? 'var(--color-transfer)' : 'var(--color-expense)'
              return (
                <div key={r._id} style={{ background: 'var(--color-card)', border: `1px solid ${r._sel ? col : 'var(--color-border)'}`, borderLeft: `3px solid ${col}`, borderRadius: 12, padding: 11, opacity: r._sel ? 1 : 0.5 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => setParsed(p => p.map((x, i) => i === idx ? { ...x, _sel: !x._sel } : x))} style={{ width: 22, height: 22, borderRadius: 5, border: `2px solid ${r._sel ? 'var(--color-accent)' : 'var(--color-border)'}`, background: r._sel ? 'rgba(245,158,11,.15)' : 'none', color: 'var(--color-accent)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', padding: 0 }}>{r._sel ? '✓' : ''}</button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{r.date} · {accounts.find(a => a.id === r.accId)?.name}</span>
                        <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: col }}>{r.type === 'income' ? '+' : '−'}{fmt(r.amount)}</span>
                      </div>
                      <input style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 12, padding: '8px 10px', width: '100%', outline: 'none', boxSizing: 'border-box' }} value={r.description} onChange={e => setParsed(p => p.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ ...btnG, flex: 1 }} onClick={() => setStep('map')}>← Back</button>
            <button style={{ ...btnP, flex: 2, opacity: !parsed.some(r => r._sel) ? 0.4 : 1, pointerEvents: !parsed.some(r => r._sel) ? 'none' : 'auto' }} onClick={doSave}>💾 Import {parsed.filter(r => r._sel).length}</button>
          </div>
        </>
      )}

      {step === 'saving' && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto', marginBottom: 14 }}>
            {logs.length === 0 ? <span className="spinner" /> : logs.map((l, i) => <div key={i} style={{ fontSize: 12, color: 'var(--color-sub)' }}>{l}</div>)}
          </div>
          {logs.length > 0 && <button style={btnP} onClick={onClose}>← Back to Transactions</button>}
        </>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────
function TransactionsContent() {
  const { transactions, accounts } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  let filtered = [...transactions].sort((a, b) => new Date(b.txn_at).getTime() - new Date(a.txn_at).getTime())
  if (filter !== 'all') filtered = filtered.filter(t => t.type === filter)
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(t => (t.description || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q) || (accounts.find(a => a.id === t.account_id)?.name || '').toLowerCase().includes(q))
  }

  const inc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const exp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const groups: Record<string, typeof filtered> = {}
  filtered.forEach(t => {
    const key = new Date(t.txn_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  })

  return (
    <AppShell title="All Transactions" showFab onFab={() => setAddOpen(true)}>
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Import / Export */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setImportOpen(true)} style={{ flex: 1, padding: 10, fontSize: 13 }}>⬆ Import</button>
          <button className="btn btn-ghost" onClick={() => setExportOpen(true)} style={{ flex: 1, padding: 10, fontSize: 13 }}>⬇ Export</button>
        </div>

        {/* Search + filters */}
        <div>
          <input type="search" placeholder="🔍  Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 10 }} />
          <FilterPills
            active={filter}
            onChange={v => setFilter(v as Filter)}
            options={[
              { value: 'all',      label: 'All' },
              { value: 'expense',  label: '↓ Expense' },
              { value: 'income',   label: '↑ Income' },
              { value: 'transfer', label: '→ Transfer' },
            ]}
          />
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div className="card" style={{ textAlign: 'center', padding: '10px 6px' }}><div style={{ fontSize: 9, color: 'var(--color-income)', fontWeight: 600, marginBottom: 3 }}>↑ IN</div><div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-income)' }}>{fmt(inc)}</div></div>
          <div className="card" style={{ textAlign: 'center', padding: '10px 6px' }}><div style={{ fontSize: 9, color: 'var(--color-expense)', fontWeight: 600, marginBottom: 3 }}>↓ OUT</div><div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-expense)' }}>{fmt(exp)}</div></div>
          <div className="card" style={{ textAlign: 'center', padding: '10px 6px' }}><div style={{ fontSize: 9, color: 'var(--color-muted)', fontWeight: 600, marginBottom: 3 }}>COUNT</div><div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{filtered.length}</div></div>
        </div>

        {/* Grouped list */}
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 28, color: 'var(--color-muted)' }}><div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>No transactions found</div>
        ) : (
          <div className="card">
            {Object.entries(groups).map(([day, gtxs], gi, arr) => {
              const dInc = gtxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
              const dExp = gtxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
              return (
                <div key={day}>
                  {gi > 0 && <div className="sep" style={{ margin: '12px 0' }} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)' }}>{day}</span>
                    <span style={{ fontSize: 11 }}>
                      {dInc > 0 && <span style={{ color: 'var(--color-income)' }}>+{fmt(dInc)}</span>}
                      {dInc > 0 && dExp > 0 && ' · '}
                      {dExp > 0 && <span style={{ color: 'var(--color-expense)' }}>−{fmt(dExp)}</span>}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {gtxs.map((t, i) => (
                      <div key={t.id}>
                        <TxRow tx={t} showAccount />
                        {i < gtxs.length - 1 && <div className="sep" style={{ margin: '8px 0' }} />}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)}>
        <TxForm onDone={() => setAddOpen(false)} />
      </Modal>
      <Modal open={exportOpen} onClose={() => setExportOpen(false)}>
        <ExportModal onClose={() => setExportOpen(false)} />
      </Modal>
      <Modal open={importOpen} onClose={() => setImportOpen(false)}>
        <ImportModal onClose={() => setImportOpen(false)} />
      </Modal>
    </AppShell>
  )
}

export default function TransactionsPage() {
  return (
    <ToastProvider>
      <DataProvider>
        <TransactionsContent />
      </DataProvider>
    </ToastProvider>
  )
}
