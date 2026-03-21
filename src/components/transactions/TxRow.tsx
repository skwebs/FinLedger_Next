'use client'
import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { useToast } from '@/components/ui/Toast'
import { fmt, fmtDT, catIcon } from '@/lib/helpers'
import { PERSON_LABELS } from '@/lib/constants'
import type { Transaction } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import TxForm from './TxForm'

interface TxRowProps {
  tx: Transaction
  showAccount?: boolean
  isPerson?: boolean
}

export default function TxRow({ tx, showAccount = true, isPerson = false }: TxRowProps) {
  const { accounts, deleteTransaction } = useStore()
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const acc = accounts.find(a => a.id === tx.account_id)
  const toAcc = tx.to_account_id ? accounts.find(a => a.id === tx.to_account_id) : null
  const col = tx.type === 'income' ? 'var(--color-income)' : tx.type === 'transfer' ? 'var(--color-transfer)' : 'var(--color-expense)'
  const sign = tx.type === 'income' ? '+' : tx.type === 'transfer' ? '→' : '−'
  const bc = tx.type === 'income' ? 'badge-income' : tx.type === 'transfer' ? 'badge-transfer' : 'badge-expense'
  const typeLabel = isPerson && tx.type !== 'transfer' ? PERSON_LABELS[tx.type as 'income' | 'expense'] : tx.type.toUpperCase()
  const { date, time } = fmtDT(tx.txn_at || tx.created_at)

  async function handleDelete() {
    try {
      await deleteTransaction(tx.id)
      toast('Deleted', 'ok')
      setConfirming(false)
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Failed', 'err')
    }
  }

  return (
    <>
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, cursor: 'pointer', padding: '2px 0' }} onClick={() => setExpanded(p => !p)}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, marginTop: 1 }}>
            {catIcon(tx.category)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tx.description || tx.category}
            </div>
            {showAccount && (
              <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 1 }}>
                {acc?.name}{toAcc ? ` → ${toAcc.name}` : ''}
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
              {date} <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{time}</span>
            </div>
            <span className={`badge ${bc}`} style={{ marginTop: 3 }}>{typeLabel}</span>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: col }}>{sign}{fmt(tx.amount)}</div>
            <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 3 }}>{expanded ? '▲' : '▼'}</div>
          </div>
        </div>

        {expanded && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
            <button className="edbtn" onClick={() => { setEditing(true); setExpanded(false) }}>✏️ Edit</button>
            <button className="dlbtn" onClick={() => setConfirming(true)}>🗑️ Delete</button>
          </div>
        )}
      </div>

      {/* Edit modal */}
      <Modal open={editing} onClose={() => setEditing(false)}>
        <TxForm tx={tx} onDone={() => setEditing(false)} />
      </Modal>

      {/* Confirm delete */}
      <Modal open={confirming} onClose={() => setConfirming(false)}>
        <h3 className="hd" style={{ fontSize: 18, marginBottom: 10 }}>Delete Transaction?</h3>
        <p style={{ color: 'var(--color-sub)', fontSize: 14, marginBottom: 20 }}>
          <strong style={{ color: 'var(--color-text)' }}>{tx.description || tx.category}</strong> · {fmt(tx.amount)}<br />
          Balance will be reversed. Cannot undo.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setConfirming(false)} style={{ flex: 1 }}>Cancel</button>
          <button className="btn" onClick={handleDelete} style={{ flex: 1, background: 'var(--color-expense)', color: '#fff' }}>Delete</button>
        </div>
      </Modal>
    </>
  )
}
