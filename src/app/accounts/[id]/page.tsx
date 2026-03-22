'use client'
import { use, useState, useRef } from 'react'
import { useStore } from '@/store/useStore'
import AppShell from '@/components/layout/AppShell'
import DataProvider from '@/components/layout/DataProvider'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import TxRow from '@/components/transactions/TxRow'
import TxForm from '@/components/transactions/TxForm'
import AccForm from '@/components/accounts/AccForm'
import FilterPills from '@/components/ui/FilterPills'
import { fmt, monthTxs, ccTxs, getCCCycle, fmtShort, daysLeft, buildTxnAt, nowDate, nowTime } from '@/lib/helpers'
import { getPersonLabels, CATS } from '@/lib/constants'

type Filter = 'all' | 'expense' | 'income' | 'transfer'

// ─── Import helpers ───────────────────────────────────
function detectDate(raw: string): string {
  if (!raw) return nowDate()
  const p: [RegExp, (...m: string[]) => string][] = [
    [/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/, (_,d,m,y) => `${y}-${m}-${d}`],
    [/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/, (_,y,m,d) => `${y}-${m}-${d}`],
    [/^(\d{2})[\/\-](\d{2})[\/\-](\d{2})$/, (_,d,m,y) => `20${y}-${m}-${d}`],
  ]
  for (const [re,fn] of p) { const mx = raw.match(re); if (mx) return fn(...mx as string[]) }
  try { const d = new Date(raw); if (!isNaN(d.getTime())) return d.toISOString().slice(0,10) } catch { /**/ }
  return nowDate()
}

function parseCSVRows(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(Boolean)
  lines.forEach(line => {
    const row: string[] = []; let cell = ''; let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c==='"') { if (inQ && line[i+1]==='"') { cell+='"'; i++ } else inQ=!inQ }
      else if (c===',' && !inQ) { row.push(cell.trim()); cell='' }
      else cell += c
    }
    row.push(cell.trim()); rows.push(row)
  })
  return rows
}

function mapRows(rows: string[][], accId: string): ImportRow[] {
  const headers = rows[0].map(h => h.toLowerCase().trim().replace(/\s+/g,'_'))
  const fi = (keys: string[]) => { for (const k of keys) { const i = headers.findIndex(h => k===h || h.includes(k) || k.includes(h)); if (i>=0) return i } return -1 }
  const dc=fi(['date','txn_date','value_date','posting_date','dt'])
  const tc=fi(['time'])
  const nc=fi(['description','narration','particulars','merchant','payee','desc'])
  const ac=fi(['amount','amt'])
  const debc=fi(['debit','dr','withdrawal'])
  const crec=fi(['credit','cr','deposit'])
  const tyc=fi(['type','txn_type'])
  const cc=fi(['category','cat'])

  return rows.slice(1).filter(r=>r.some(c=>c.trim())).map((row,i) => {
    const getAmt = (col:number) => Math.abs(parseFloat(String(row[col]||'').replace(/[^0-9.-]/g,''))||0)
    let amount=0; let type: TxType='expense'
    if (debc>=0||crec>=0) {
      const d=debc>=0?getAmt(debc):0; const cr=crec>=0?getAmt(crec):0
      amount=d>0?d:cr; type=d>0?'expense':'income'
    } else if (ac>=0) { amount=getAmt(ac) }
    if (tyc>=0) {
      const tv=String(row[tyc]||'').toLowerCase()
      if (tv.includes('income')||tv.includes('credit')) type='income'
      else if (tv.includes('expense')||tv.includes('debit')) type='expense'
      else if (tv.includes('transfer')) type='transfer'
      else if (['expense','income','transfer'].includes(tv)) type=tv as TxType
    }
    const date = dc>=0 ? detectDate(String(row[dc]||'')) : nowDate()
    const time = tc>=0 ? String(row[tc]||'12:00').slice(0,5) : '12:00'
    const desc = nc>=0 ? String(row[nc]||'').trim() : 'Transaction'
    const cat  = cc>=0 && CATS.includes(String(row[cc])) ? String(row[cc]) : 'Other'
    return { _id:'i'+i, _sel:amount>0, description:desc||'Transaction', amount, type, category:cat, date, time, accId }
  }).filter(r=>r.amount>0)
}

// ─── Export helper ────────────────────────────────────
function buildCSV(txs: Transaction[], accName: string): string {
  const headers = ['Date','Time','Description','Amount','Type','Category']
  const rows = txs.map(t => {
    const dt = new Date(t.txn_at||t.created_at)
    return [dt.toISOString().slice(0,10), dt.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:false}), t.description||'', t.amount, t.type, t.category||'Other']
  })
  return [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n')
}

function downloadCSV(content: string, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}))
  a.download = filename; a.click(); URL.revokeObjectURL(a.href)
}

// ─── Checkbox ─────────────────────────────────────────
function Checkbox({ checked, indeterminate=false, onChange }: { checked:boolean; indeterminate?:boolean; onChange:()=>void }) {
  return (
    <button onClick={e=>{e.stopPropagation();onChange()}} style={{
      width:22, height:22, borderRadius:6, flexShrink:0,
      border:`2px solid ${checked||indeterminate?'var(--color-accent)':'var(--color-border)'}`,
      background:checked?'var(--color-accent)':indeterminate?'rgba(245,158,11,.2)':'transparent',
      color:checked?'#0b0b18':'var(--color-accent)',
      fontSize:13, display:'flex', alignItems:'center', justifyContent:'center',
      cursor:'pointer', padding:0, fontFamily:'var(--font-sans)',
    }}>
      {checked?'✓':indeterminate?'−':''}
    </button>
  )
}

// ─── Import modal ─────────────────────────────────────
function ImportModal({ accId, onClose }: { accId: string; onClose: () => void }) {
  const { addTransaction } = useStore()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'pick'|'review'|'saving'>('pick')
  const [parsed, setParsed] = useState<ImportRow[]>([])
  const [logs, setLogs] = useState<string[]>([])

  const btnP: React.CSSProperties = { display:'block', width:'100%', border:'none', borderRadius:12, fontWeight:700, fontSize:15, padding:'13px 20px', background:'var(--color-accent)', color:'#0b0b18', cursor:'pointer', fontFamily:'var(--font-sans)', textAlign:'center' }
  const btnG: React.CSSProperties = { display:'block', width:'100%', border:'1.5px solid var(--color-border)', borderRadius:12, fontWeight:700, fontSize:15, padding:'13px 20px', background:'var(--color-surface)', color:'var(--color-text)', cursor:'pointer', fontFamily:'var(--font-sans)', textAlign:'center' }

  async function handleFile(file: File) {
    const text = await file.text()
    const rows = parseCSVRows(text)
    if (rows.length < 2) { toast('No data rows found', 'err'); return }
    setParsed(mapRows(rows, accId))
    setStep('review')
  }

  async function doSave() {
    const toSave = parsed.filter(r=>r._sel)
    if (!toSave.length) { toast('Select at least one', 'err'); return }
    setStep('saving'); const ls: string[] = []; let ok=0,fail=0
    for (const r of toSave) {
      try {
        await addTransaction({ account_id:r.accId, amount:r.amount, type:r.type, category:r.category, description:r.description, txn_at:buildTxnAt(r.date,r.time), to_account_id:null })
        ls.push(`✅ ${r.description} — ${fmt(r.amount)}`); ok++
      } catch(e:unknown) { ls.push(`❌ ${r.description}: ${e instanceof Error?e.message.slice(0,40):'failed'}`); fail++ }
    }
    ls.push(''); ls.push(`🎉 Done! ${ok} imported${fail?`, ${fail} failed`:''}`)
    setLogs(ls); toast(`Imported ${ok}${fail?`, ${fail} failed`:''}`,ok>0?'ok':'err')
  }

  return (
    <div>
      <h3 className="hd" style={{ fontSize:18, marginBottom:14 }}>Import to This Account</h3>
      {step==='pick' && (
        <>
          <label htmlFor="imp-file2" style={{ display:'block', border:'2px dashed var(--color-border)', borderRadius:14, padding:'28px 16px', textAlign:'center', cursor:'pointer', marginBottom:14 }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📁</div>
            <div style={{ fontSize:14, fontWeight:600 }}>Tap to choose CSV file</div>
            <div style={{ fontSize:12, color:'var(--color-muted)', marginTop:4 }}>All transactions will be imported to this account</div>
          </label>
          <input id="imp-file2" type="file" accept=".csv" style={{ display:'none' }} ref={fileRef} onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])} />
          <button style={btnG} onClick={onClose}>Cancel</button>
        </>
      )}
      {step==='review' && (
        <>
          <p style={{ color:'var(--color-sub)', fontSize:13, marginBottom:12 }}>
            {parsed.filter(r=>r._sel).length} of {parsed.length} rows selected
          </p>
          <div style={{ maxHeight:'45dvh', overflowY:'auto', display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
            {parsed.map((r,idx) => {
              const col = r.type==='income'?'var(--color-income)':r.type==='transfer'?'var(--color-transfer)':'var(--color-expense)'
              return (
                <div key={r._id} style={{ background:'var(--color-card)', border:`1px solid ${r._sel?col:'var(--color-border)'}`, borderLeft:`3px solid ${col}`, borderRadius:12, padding:11, opacity:r._sel?1:0.5 }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <button onClick={()=>setParsed(p=>p.map((x,i)=>i===idx?{...x,_sel:!x._sel}:x))} style={{ width:22, height:22, borderRadius:5, border:`2px solid ${r._sel?'var(--color-accent)':'var(--color-border)'}`, background:r._sel?'rgba(245,158,11,.15)':'none', color:'var(--color-accent)', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:'pointer', padding:0 }}>{r._sel?'✓':''}</button>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <span style={{ fontSize:11, color:'var(--color-muted)' }}>{r.date}</span>
                        <span className="mono" style={{ fontSize:14, fontWeight:700, color:col }}>{r.type==='income'?'+':'−'}{fmt(r.amount)}</span>
                      </div>
                      <input style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:8, color:'var(--color-text)', fontFamily:'var(--font-sans)', fontSize:12, padding:'8px 10px', width:'100%', outline:'none', boxSizing:'border-box' }} value={r.description} onChange={e=>setParsed(p=>p.map((x,i)=>i===idx?{...x,description:e.target.value}:x))} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button style={{ ...btnG, flex:1 }} onClick={()=>setStep('pick')}>← Back</button>
            <button style={{ ...btnP, flex:2, opacity:!parsed.some(r=>r._sel)?0.4:1, pointerEvents:!parsed.some(r=>r._sel)?'none':'auto' }} onClick={doSave}>💾 Import {parsed.filter(r=>r._sel).length}</button>
          </div>
        </>
      )}
      {step==='saving' && (
        <>
          <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:300, overflowY:'auto', marginBottom:14 }}>
            {logs.length===0?<span className="spinner"/>:logs.map((l,i)=><div key={i} style={{ fontSize:12, color:'var(--color-sub)' }}>{l}</div>)}
          </div>
          {logs.length>0 && <button style={btnP} onClick={onClose}>← Back to Account</button>}
        </>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────
function AccDetailContent({ id }: { id: string }) {
  const { accounts, transactions, month, loaded, bulkDeleteTransactions } = useStore()
  const { toast } = useToast()
  const [ccOffset, setCcOffset] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const acc = accounts.find(a => a.id === id)

  if (!loaded || !acc) {
    return (
      <AppShell title="Account" showBack backHref="/accounts">
        <div style={{ display:'flex', flexDirection:'column', gap:12, paddingTop:12 }}>
          {[120,60,80].map((h,i) => <div key={i} style={{ height:h, borderRadius:16, background:'var(--color-card)', border:'1px solid var(--color-border)', animation:'shimmer 1.4s ease-in-out infinite', opacity:1-i*0.15 }} />)}
        </div>
        <style>{`@keyframes shimmer{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
      </AppShell>
    )
  }

  const isCC   = acc.type === 'credit_card' && acc.billing_day
  const isPerson = acc.type === 'person'
  const rel = isPerson ? getPersonLabels(acc.relationship_type) : null

  // All transactions for this account (no month filter for non-CC)
  let allTxs = isCC
    ? ccTxs(acc, transactions, ccOffset)
    : transactions.filter(t => t.account_id === acc.id).sort((a,b) => new Date(b.txn_at).getTime()-new Date(a.txn_at).getTime())

  // Apply type filter
  if (filter !== 'all') allTxs = allTxs.filter(t => t.type === filter)

  const inc = allTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)
  const exp = allTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)

  // Group by Month Year for timeline
  const groups: Record<string, Transaction[]> = {}
  allTxs.forEach(t => {
    const key = new Date(t.txn_at).toLocaleDateString('en-IN',{month:'long',year:'numeric'})
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  })

  const allIds = allTxs.map(t => t.id)
  const allSel = allIds.length>0 && allIds.every(id=>selected.has(id))
  const someSel = allIds.some(id=>selected.has(id))

  function toggleSel(id: string) { setSelected(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n}) }
  function exitSel() { setSelectMode(false); setSelected(new Set()) }

  async function handleBulkDelete() {
    if (!selected.size) return
    if (!confirm(`Delete ${selected.size} transaction${selected.size!==1?'s':''}? Balances will be reversed.`)) return
    setBulkDeleting(true)
    try {
      await bulkDeleteTransactions(Array.from(selected))
      toast(`Deleted ${selected.size}`, 'ok'); exitSel()
    } catch(e:unknown) { toast(e instanceof Error?e.message:'Failed','err') }
    finally { setBulkDeleting(false) }
  }

  function handleExport() {
    const csv = buildCSV(transactions.filter(t=>t.account_id===acc.id), acc.name)
    downloadCSV(csv, `${acc.name.replace(/[^a-z0-9]/gi,'_')}_${nowDate()}.csv`)
    toast('Exported CSV', 'ok')
  }

  const balColor = isPerson
    ? (acc.balance>0?'var(--color-person)':acc.balance<0?'var(--color-expense)':'var(--color-muted)')
    : (acc.balance<0?'var(--color-expense)':'var(--color-accent)')
  const balStr = isPerson
    ? `${acc.balance>0?'+':acc.balance<0?'−':''}${fmt(Math.abs(acc.balance))}`
    : fmt(acc.balance)
  const balSub = isPerson && rel ? rel.balanceLbl(acc.balance) : 'Balance'

  const btnDanger: React.CSSProperties = { border:'none', borderRadius:10, fontWeight:700, fontSize:14, padding:'11px 20px', background:'var(--color-expense)', color:'#fff', cursor:'pointer', fontFamily:'var(--font-sans)', opacity:bulkDeleting?0.6:1 }
  const btnOut: React.CSSProperties = { border:'1.5px solid var(--color-border)', borderRadius:10, fontWeight:600, fontSize:14, padding:'11px 20px', background:'var(--color-surface)', color:'var(--color-text)', cursor:'pointer', fontFamily:'var(--font-sans)' }

  const filterOpts = [
    {value:'all',label:'All'},
    {value:'expense',label:rel?.expenseLbl||'↓ Expense'},
    {value:'income',label:rel?.incomeLbl||'↑ Income'},
    {value:'transfer',label:'→ Transfer'},
  ].filter(o => {
    if (o.value==='income' && rel && !rel.incomeLbl) return false
    if (o.value==='expense' && rel && !rel.expenseLbl) return false
    return true
  })

  return (
    <AppShell title={acc.name} showBack backHref="/accounts" showFab onFab={() => setAddOpen(true)}
      onImport={() => setImportOpen(true)} onExport={handleExport}
      headerRight={
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {isCC && (
            <div style={{ display:'flex', gap:4 }}>
              <button onClick={()=>setCcOffset(p=>p-1)} style={{ ...btnOut, padding:'6px 10px', fontSize:12 }}>‹</button>
              <button onClick={()=>setCcOffset(p=>Math.min(0,p+1))} disabled={ccOffset>=0} style={{ ...btnOut, padding:'6px 10px', fontSize:12, opacity:ccOffset>=0?0.3:1 }}>›</button>
            </div>
          )}
        </div>
      }>
      <div className="fade-up" style={{ display:'flex', flexDirection:'column', gap:12 }}>

        {/* Header card */}
        <div className="card" style={{ borderLeft:`3px solid ${acc.color}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
            <div>
              <div className="hd" style={{ fontSize:18, fontWeight:800 }}>{acc.name}</div>
              <div style={{ fontSize:12, color:'var(--color-muted)' }}>{acc.type.replace('_',' ').toUpperCase()}</div>
              {rel && <div style={{ fontSize:11, color:'var(--color-person)', marginTop:3 }}>{rel.l}</div>}
            </div>
            <div style={{ textAlign:'right' }}>
              <div className="mono" style={{ fontSize:22, fontWeight:800, color:balColor }}>{balStr}</div>
              <div style={{ fontSize:12, color:'var(--color-muted)' }}>{balSub}</div>
            </div>
          </div>

          {isCC && acc.credit_limit && (() => {
            const usage = Math.min(100, exp/acc.credit_limit*100)
            const bc = usage>80?'var(--color-expense)':usage>50?'var(--color-warning)':'var(--color-income)'
            const dl = daysLeft(acc.billing_day!)
            const {start,end} = getCCCycle(acc.billing_day!,ccOffset)
            return (
              <div style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:11, color:'var(--color-muted)' }}>
                  <span>{fmtShort(start)} – {fmtShort(end)}</span>
                  <span>Due day {acc.billing_day} · {dl}d left</span>
                </div>
                <div style={{ height:6, background:'var(--color-surface)', borderRadius:3, overflow:'hidden', marginBottom:4 }}>
                  <div style={{ width:`${usage}%`, height:'100%', background:bc, borderRadius:3 }} />
                </div>
                <div style={{ fontSize:11, color:'var(--color-muted)' }}>{usage.toFixed(0)}% · {fmt(exp)} of {fmt(acc.credit_limit)}</div>
              </div>
            )
          })()}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
            {[
              {l:rel?rel.incomeLbl||'↑ IN':'↑ IN', v:inc, c:'var(--color-income)'},
              {l:rel?rel.expenseLbl||'↓ OUT':'↓ OUT', v:exp, c:'var(--color-expense)'},
              {l:'TXNS', v:allTxs.length, c:'var(--color-text)', isCt:true},
            ].map(({l,v,c,isCt})=>(
              <div key={l} className="card-inset" style={{ textAlign:'center' }}>
                <div style={{ fontSize:9, color:c, fontWeight:600 }}>{l}</div>
                <div className="mono" style={{ fontSize:13, fontWeight:700, color:c }}>{isCt?v:fmt(v as number)}</div>
              </div>
            ))}
          </div>

          <button className="edbtn" style={{ width:'100%' }} onClick={() => setEditOpen(true)}>✏️ Edit Account</button>
        </div>

        {/* Toolbar */}
        {!selectMode ? (
          <div style={{ display:'flex', gap:8 }}>
            <button style={{ ...btnOut, flex:1, padding:'10px 0', fontSize:13 }} onClick={()=>setImportOpen(true)}>⬆ Import</button>
            <button style={{ ...btnOut, flex:1, padding:'10px 0', fontSize:13 }} onClick={handleExport}>⬇ Export</button>
            <button style={{ ...btnOut, padding:'10px 14px', fontSize:13, color:'var(--color-muted)' }} onClick={()=>setSelectMode(true)}>☑ Select</button>
          </div>
        ) : (
          <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:14, padding:'10px 14px' }}>
            <Checkbox checked={allSel} indeterminate={someSel&&!allSel} onChange={()=>setSelected(allSel?new Set():new Set(allIds))} />
            <span style={{ flex:1, fontSize:14, fontWeight:600, color:'var(--color-sub)' }}>{selected.size===0?'Tap to select':`${selected.size} selected`}</span>
            <button style={{ ...btnOut, padding:'7px 14px', fontSize:13 }} onClick={exitSel}>Cancel</button>
          </div>
        )}

        {/* Type filter pills */}
        <FilterPills active={filter} onChange={v=>setFilter(v as Filter)} options={filterOpts} />

        {/* Timeline grouped by Month */}
        {allTxs.length === 0 ? (
          <div className="card" style={{ textAlign:'center', padding:28, color:'var(--color-muted)' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>📝</div>No transactions
          </div>
        ) : (
          Object.entries(groups).map(([month, txs]) => {
            const mInc = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)
            const mExp = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)
            const monthAllSel = txs.every(t=>selected.has(t.id))
            const monthSomeSel = txs.some(t=>selected.has(t.id))
            return (
              <div key={month}>
                {/* Month header */}
                <div style={{ display:'flex', alignItems:'center', gap:10, paddingBottom:8, marginBottom:4, borderBottom:'1px solid var(--color-border)' }}>
                  {selectMode && (
                    <Checkbox checked={monthAllSel} indeterminate={monthSomeSel&&!monthAllSel}
                      onChange={()=>setSelected(p=>{const n=new Set(p);monthAllSel?txs.forEach(t=>n.delete(t.id)):txs.forEach(t=>n.add(t.id));return n})} />
                  )}
                  <span style={{ flex:1, fontSize:13, fontWeight:700, color:'var(--color-accent)' }}>{month}</span>
                  <span style={{ fontSize:11 }}>
                    {mInc>0&&<span style={{ color:'var(--color-income)' }}>+{fmt(mInc)}</span>}
                    {mInc>0&&mExp>0&&<span style={{ color:'var(--color-muted)' }}> · </span>}
                    {mExp>0&&<span style={{ color:'var(--color-expense)' }}>−{fmt(mExp)}</span>}
                  </span>
                </div>
                {/* Rows */}
                <div className="card" style={{ marginBottom:14 }}>
                  {txs.map((t,i)=>(
                    <div key={t.id}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                        {selectMode && <div style={{ paddingTop:4, flexShrink:0 }}><Checkbox checked={selected.has(t.id)} onChange={()=>toggleSel(t.id)} /></div>}
                        <div style={{ flex:1, minWidth:0 }}>
                          <TxRow tx={t} showAccount={false} isPerson={isPerson} disableExpand={selectMode} onRowClick={selectMode?()=>toggleSel(t.id):undefined} />
                        </div>
                      </div>
                      {i<txs.length-1&&<div className="sep" style={{ margin:'8px 0' }} />}
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}

        {selectMode && <div style={{ height:80 }} />}
      </div>

      {/* Bulk delete bar */}
      {selectMode && (
        <div style={{ position:'fixed', bottom:'calc(64px + env(safe-area-inset-bottom, 0px))', left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, background:'var(--color-card)', borderTop:'1px solid var(--color-border)', padding:'10px 16px', display:'flex', alignItems:'center', gap:10, zIndex:80, boxShadow:'0 -4px 20px rgba(0,0,0,0.3)' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:selected.size>0?'var(--color-text)':'var(--color-muted)' }}>
              {selected.size===0?'No selection':`${selected.size} selected`}
            </div>
          </div>
          <button style={{ ...btnDanger, opacity:selected.size===0||bulkDeleting?0.4:1, pointerEvents:selected.size===0?'none':'auto' }}
            disabled={selected.size===0||bulkDeleting} onClick={handleBulkDelete}>
            {bulkDeleting?<span className="spinner"/>:`🗑️ Delete ${selected.size>0?selected.size:''}`}
          </button>
        </div>
      )}

      <Modal open={addOpen} onClose={()=>setAddOpen(false)}><TxForm preAccId={acc.id} onDone={()=>setAddOpen(false)} /></Modal>
      <Modal open={editOpen} onClose={()=>setEditOpen(false)}><AccForm acc={acc} onDone={()=>setEditOpen(false)} /></Modal>
      <Modal open={importOpen} onClose={()=>setImportOpen(false)}><ImportModal accId={acc.id} onClose={()=>setImportOpen(false)} /></Modal>
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
