'use client'
import { useState, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { useToast } from '@/components/ui/Toast'
import { CATS, ACC_TYPES } from '@/lib/constants'
import { catIcon, buildTxnAt, nowDate, nowTime } from '@/lib/helpers'
import type { Transaction, TxType } from '@/lib/types'

interface TxFormProps {
  tx?: Transaction | null
  preAccId?: string | null
  onDone: () => void
}

export default function TxForm({ tx, preAccId, onDone }: TxFormProps) {
  const { accounts, addTransaction, updateTransaction } = useStore()
  const { toast } = useToast()
  const isEdit = !!tx

  const [type, setType] = useState<TxType>(tx?.type || 'expense')
  const [amount, setAmount] = useState(tx ? String(tx.amount) : '')
  const [accId, setAccId] = useState(tx?.account_id || preAccId || accounts[0]?.id || '')
  const [toAccId, setToAccId] = useState(tx?.to_account_id || '')
  const [category, setCategory] = useState(tx?.category || 'Food')
  const [desc, setDesc] = useState(tx?.description || '')
  const [date, setDate] = useState(tx ? new Date(tx.txn_at).toISOString().slice(0, 10) : nowDate())
  const [time, setTime] = useState(tx ? new Date(tx.txn_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : nowTime())
  const [loading, setLoading] = useState(false)

  const acc = accounts.find(a => a.id === accId)
  const isPerson = acc?.type === 'person'

  const typeLabels: Record<TxType, string> = {
    expense: isPerson ? '✅ Received' : '↓ Expense',
    income: isPerson ? '💸 Lent' : '↑ Income',
    transfer: '→ Transfer',
  }
  const typeColors: Record<TxType, string> = {
    expense: 'var(--color-expense)',
    income: 'var(--color-income)',
    transfer: 'var(--color-transfer)',
  }

  async function handleSubmit() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast('Enter valid amount', 'err'); return }
    if (!accId) { toast('Select account', 'err'); return }
    if (type === 'transfer' && toAccId === accId) { toast('Choose different target account', 'err'); return }

    setLoading(true)
    const data = {
      account_id: accId,
      amount: amt,
      type,
      category: type === 'transfer' ? 'Transfer' : category,
      description: desc,
      txn_at: buildTxnAt(date, time),
      to_account_id: type === 'transfer' ? (toAccId || null) : null,
    }
    try {
      if (isEdit && tx) {
        await updateTransaction(tx.id, data)
        toast('Transaction updated!', 'ok')
      } else {
        await addTransaction(data)
        toast('Transaction added!', 'ok')
      }
      onDone()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Failed', 'err')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h3 className="hd" style={{ fontSize: 18, marginBottom: 14 }}>{isEdit ? 'Edit' : 'New'} Transaction</h3>

      {/* Type toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['expense', 'income', 'transfer'] as TxType[]).map(t => (
          <div key={t} onClick={() => setType(t)} style={{
            flex: 1, textAlign: 'center', padding: '9px 4px', borderRadius: 10,
            fontSize: 11, fontWeight: 700, cursor: 'pointer', userSelect: 'none',
            background: type === t ? typeColors[t] : 'var(--color-surface)',
            color: type === t ? '#fff' : 'var(--color-muted)',
            border: `1.5px solid ${type === t ? 'transparent' : 'var(--color-border)'}`,
            transition: 'all .18s',
          }}>
            {typeLabels[t]}
          </div>
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
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.type.replace('_', ' ')})</option>
            ))}
          </select>
        </div>
        {type === 'transfer' && (
          <div>
            <label>To Account</label>
            <select value={toAccId} onChange={e => setToAccId(e.target.value)}>
              <option value="">— select —</option>
              {accounts.filter(a => a.id !== accId).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}
        {type !== 'transfer' && (
          <div>
            <label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {CATS.map(c => <option key={c} value={c}>{catIcon(c)} {c}</option>)}
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
        {isPerson && (
          <div style={{ background: 'rgba(167,139,250,.08)', border: '1px solid rgba(167,139,250,.2)', borderRadius: 9, padding: '10px 12px', fontSize: 12, color: 'var(--color-sub)' }}>
            💸 <strong style={{ color: 'var(--color-person)' }}>Lent</strong> → they owe you more · ✅ <strong style={{ color: 'var(--color-income)' }}>Received</strong> → reduces what they owe
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button className="btn btn-ghost" onClick={onDone} style={{ flex: 1 }}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ flex: 2 }}>
          {loading ? <span className="spinner" /> : isEdit ? 'Save Changes' : 'Add'}
        </button>
      </div>
    </div>
  )
}
