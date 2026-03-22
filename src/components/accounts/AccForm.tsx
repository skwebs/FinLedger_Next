'use client'
import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { useToast } from '@/components/ui/Toast'
import { ACC_TYPES, COLORS, RELATIONSHIP_TYPES } from '@/lib/constants'
import type { Account, AccountType, PersonRelationship } from '@/lib/types'

export default function AccForm({ acc, onDone }: { acc?: Account | null; onDone: () => void }) {
  const { addAccount, updateAccount } = useStore()
  const { toast } = useToast()
  const isEdit = !!acc

  const [name, setName] = useState(acc?.name || '')
  const [type, setType] = useState<AccountType>(acc?.type || 'bank')
  const [relType, setRelType] = useState<PersonRelationship>(acc?.relationship_type || 'lend_borrow')
  const [balance, setBalance] = useState(String(acc?.balance ?? 0))
  const [creditLimit, setCreditLimit] = useState(String(acc?.credit_limit ?? ''))
  const [billingDay, setBillingDay] = useState(String(acc?.billing_day ?? ''))
  const [color, setColor] = useState(acc?.color || COLORS[0])
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!name.trim()) { toast('Enter account name', 'err'); return }
    setLoading(true)
    const data = {
      name: name.trim(), type, balance: parseFloat(balance) || 0, currency: 'INR', color,
      billing_day: type === 'credit_card' ? (parseInt(billingDay) || null) : null,
      credit_limit: type === 'credit_card' ? (parseFloat(creditLimit) || null) : null,
      relationship_type: type === 'person' ? relType : null,
    }
    try {
      if (isEdit && acc) { await updateAccount(acc.id, data); toast('Updated!', 'ok') }
      else { await addAccount(data); toast('Account added!', 'ok') }
      onDone()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Failed', 'err')
    } finally { setLoading(false) }
  }

  const btnG: React.CSSProperties = { display: 'block', width: '100%', border: '1.5px solid var(--color-border)', borderRadius: 12, fontWeight: 700, fontSize: 15, padding: '13px 20px', background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'center' }
  const btnP: React.CSSProperties = { display: 'block', width: '100%', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, padding: '13px 20px', background: 'var(--color-accent)', color: '#0b0b18', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'center' }

  return (
    <div>
      <h3 className="hd" style={{ fontSize: 18, marginBottom: 18 }}>{isEdit ? 'Edit' : 'New'} Account</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div>
          <label>Account Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. HDFC Savings" />
        </div>

        <div>
          <label>Type</label>
          <select value={type} onChange={e => setType(e.target.value as AccountType)}>
            {ACC_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </div>

        {/* Person relationship type */}
        {type === 'person' && (
          <>
            <div>
              <label>Relationship Type</label>
              <select value={relType} onChange={e => setRelType(e.target.value as PersonRelationship)}>
                {RELATIONSHIP_TYPES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
            </div>
            <div style={{ background: 'rgba(167,139,250,.08)', border: '1px solid rgba(167,139,250,.2)', borderRadius: 10, padding: '10px 13px', fontSize: 12, color: 'var(--color-sub)' }}>
              {RELATIONSHIP_TYPES.find(r => r.v === relType)?.desc}
              {relType !== 'pay_to' && <><br /><span style={{ color: 'var(--color-person)' }}>↑ Income: </span>{RELATIONSHIP_TYPES.find(r => r.v === relType)?.incomeLbl || '—'}</>}
              {relType !== 'receive_from' && <><br /><span style={{ color: 'var(--color-expense)' }}>↓ Expense: </span>{RELATIONSHIP_TYPES.find(r => r.v === relType)?.expenseLbl || '—'}</>}
            </div>
          </>
        )}

        <div>
          <label>{isEdit ? 'Balance Override (₹)' : 'Opening Balance (₹)'}</label>
          <input type="number" value={balance} onChange={e => setBalance(e.target.value)} inputMode="decimal" />
          {isEdit && <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>⚠️ Only change for corrections. Use transactions normally.</div>}
        </div>

        {type === 'credit_card' && (
          <>
            <div>
              <label>Credit Limit (₹)</label>
              <input type="number" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} inputMode="decimal" placeholder="e.g. 100000" />
            </div>
            <div>
              <label>Billing Day (1–28)</label>
              <input type="number" value={billingDay} onChange={e => setBillingDay(e.target.value)} min={1} max={28} inputMode="numeric" placeholder="e.g. 5" />
              <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>Day 5 = cycle: 6th prev month → 5th this month</div>
            </div>
          </>
        )}

        <div>
          <label>Color</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {COLORS.map(c => (
              <div key={c} onClick={() => setColor(c)} style={{
                width: 30, height: 30, borderRadius: '50%', background: c, cursor: 'pointer',
                border: `3px solid ${c === color ? '#fff' : 'transparent'}`,
                transform: c === color ? 'scale(1.15)' : 'scale(1)', transition: 'all .18s', flexShrink: 0,
              }} />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button style={{ ...btnG, flex: 1 }} onClick={onDone}>Cancel</button>
          <button style={{ ...btnP, flex: 2, opacity: loading ? 0.5 : 1 }} onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="spinner" /> : isEdit ? 'Save Changes' : 'Add Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
