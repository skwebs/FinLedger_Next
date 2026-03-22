'use client'
import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { useToast } from '@/components/ui/Toast'
import { getPersonLabels } from '@/lib/constants'
import { catIcon, buildTxnAt, nowDate, nowTime } from '@/lib/helpers'
import type { Transaction, TxType } from '@/lib/types'

export default function TxForm({ tx, preAccId, onDone }: { tx?: Transaction | null; preAccId?: string | null; onDone: () => void }) {
  const { accounts, categories, addTransaction, updateTransaction } = useStore()
  const { toast } = useToast()
  const isEdit = !!tx

  const [type, setType] = useState<TxType>(tx?.type || 'expense')
  const [amount, setAmount] = useState(tx ? String(tx.amount) : '')
  const [accId, setAccId] = useState(tx?.account_id || preAccId || accounts[0]?.id || '')
  const [toAccId, setToAccId] = useState(tx?.to_account_id || '')
  const [category, setCategory] = useState(tx?.category || categories.find(c => c.active)?.name || 'Other')
  const [desc, setDesc] = useState(tx?.description || '')
  const [date, setDate] = useState(tx ? new Date(tx.txn_at).toISOString().slice(0, 10) : nowDate())
  const [time, setTime] = useState(tx ? new Date(tx.txn_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : nowTime())
  const [loading, setLoading] = useState(false)

  const acc = accounts.find(a => a.id === accId)
  const isPerson = acc?.type === 'person'
  const rel = isPerson ? getPersonLabels(acc?.relationship_type) : null

  // Hide income side for pay_to, hide expense for receive_from
  const showIncome  = !isPerson || acc?.relationship_type !== 'pay_to'
  const showExpense = !isPerson || acc?.relationship_type !== 'receive_from'

  const typeLabels: Record<TxType, string> = {
    expense:  rel ? rel.expenseLbl || '↓ Paid' : '↓ Expense',
    income:   rel ? rel.incomeLbl  || '↑ Received' : '↑ Income',
    transfer: '→ Transfer',
  }
  const typeColors: Record<TxType, string> = {
    expense: 'var(--color-expense)', income: 'var(--color-income)', transfer: 'var(--color-transfer)',
  }

  const activeCats = categories.filter(c => c.active)

  async function handleSubmit() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast('Enter valid amount', 'err'); return }
    if (!accId) { toast('Select account', 'err'); return }
    if (type === 'transfer' && toAccId === accId) { toast('Choose different target account', 'err'); return }
    setLoading(true)
    const data = {
      account_id: accId, amount: amt, type, description: desc,
      category: type === 'transfer' ? 'Transfer' : category,
      txn_at: buildTxnAt(date, time),
      to_account_id: type === 'transfer' ? (toAccId || null) : null,
    }
    try {
      if (isEdit && tx) { await updateTransaction(tx.id, data); toast('Updated!', 'ok') }
      else { await addTransaction(data); toast('Added!', 'ok') }
      onDone()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Failed', 'err')
    } finally { setLoading(false) }
  }

  const btnG: React.CSSProperties = { display: 'block', width: '100%', border: '1.5px solid var(--color-border)', borderRadius: 12, fontWeight: 700, fontSize: 15, padding: '13px 20px', background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'center' }
  const btnP: React.CSSProperties = { display: 'block', width: '100%', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, padding: '13px 20px', background: 'var(--color-accent)', color: '#0b0b18', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'center' }

  const availableTypes: TxType[] = ['expense', 'income', 'transfer'].filter(t =>
    t === 'transfer' || (t === 'income' && showIncome) || (t === 'expense' && showExpense)
  ) as TxType[]

  return (
    <div>
      <h3 className="hd" style={{ fontSize: 18, marginBottom: 14 }}>{isEdit ? 'Edit' : 'New'} Transaction</h3>

      {/* Type toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {availableTypes.map(t => (
          <div key={t} onClick={() => setType(t)} style={{
            flex: 1, textAlign: 'center', padding: '9px 4px', borderRadius: 10, fontSize: 11,
            fontWeight: 700, cursor: 'pointer', userSelect: 'none',
            background: type === t ? typeColors[t] : 'var(--color-surface)',
            color: type === t ? '#fff' : 'var(--color-muted)',
            border: `1.5px solid ${type === t ? 'transparent' : 'var(--color-border)'}`,
            transition: 'all .18s',
          }}>{typeLabels[t]}</div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label>Amount (₹)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" inputMode="decimal" />
        </div>

        <div>
          <label>From Account</label>
          <select value={accId} onChange={e => setAccId(e.target.value)}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type.replace('_', ' ')})</option>)}
          </select>
        </div>

        {type === 'transfer' && (
          <div>
            <label>To Account</label>
            <select value={toAccId} onChange={e => setToAccId(e.target.value)}>
              <option value="">— select —</option>
              {accounts.filter(a => a.id !== accId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}

        {type !== 'transfer' && (
          <div>
            <label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {activeCats.map(c => <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label>Description</label>
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional…" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><label>Time</label><input type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
        </div>

        {isPerson && rel && (
          <div style={{ background: 'rgba(167,139,250,.08)', border: '1px solid rgba(167,139,250,.2)', borderRadius: 9, padding: '10px 12px', fontSize: 12, color: 'var(--color-sub)' }}>
            {rel.desc}<br />
            {showIncome && <><span style={{ color: 'var(--color-person)' }}>↑ </span>{rel.incomeLbl} · </>}
            {showExpense && <><span style={{ color: 'var(--color-expense)' }}>↓ </span>{rel.expenseLbl}</>}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button style={{ ...btnG, flex: 1 }} onClick={onDone}>Cancel</button>
          <button style={{ ...btnP, flex: 2, opacity: loading ? 0.5 : 1 }} onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="spinner" /> : isEdit ? 'Save Changes' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
