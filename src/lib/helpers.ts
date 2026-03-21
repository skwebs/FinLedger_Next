import type { Account, Transaction } from './types'

export function fmt(n: number, cur = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: cur, maximumFractionDigits: 0,
  }).format(n || 0)
}

export function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function fmtShort(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
  })
}

export function fmtDT(d: string | Date) {
  const dt = new Date(d)
  return {
    date: dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
  }
}

export function nowDate() {
  return new Date().toISOString().slice(0, 10)
}

export function nowTime() {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export function buildTxnAt(dateStr: string, timeStr: string) {
  if (!dateStr) return new Date().toISOString()
  try {
    return new Date(`${dateStr}T${timeStr || '00:00'}:00`).toISOString()
  } catch {
    return new Date().toISOString()
  }
}

// Credit card billing cycle
export function getCCCycle(billingDay: number, offset = 0) {
  const today = new Date()
  let endM = today.getMonth()
  let endY = today.getFullYear()
  if (today.getDate() > billingDay) {
    endM++
    if (endM > 11) { endM = 0; endY++ }
  }
  endM += offset
  while (endM > 11) { endM -= 12; endY++ }
  while (endM < 0)  { endM += 12; endY-- }
  const cycleEnd = new Date(endY, endM, billingDay, 23, 59, 59, 999)
  let sM = endM - 1, sY = endY
  if (sM < 0) { sM = 11; sY-- }
  return { start: new Date(sY, sM, billingDay + 1), end: cycleEnd }
}

export function daysLeft(billingDay: number) {
  const today = new Date()
  let target = new Date(today.getFullYear(), today.getMonth(), billingDay)
  if (today.getDate() > billingDay) {
    target = new Date(today.getFullYear(), today.getMonth() + 1, billingDay)
  }
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

export function ccTxs(acc: Account, txns: Transaction[], offset = 0) {
  if (!acc.billing_day) return []
  const { start, end } = getCCCycle(acc.billing_day, offset)
  return txns.filter(t => {
    if (!t.txn_at || t.account_id !== acc.id) return false
    const d = new Date(t.txn_at)
    return d >= start && d <= end
  })
}

export function monthTxs(txns: Transaction[], month: string) {
  return txns.filter(t => {
    if (!t.txn_at) return false
    const d = new Date(t.txn_at)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === month
  })
}

export function accTypeColor(type: string): string {
  const map: Record<string, string> = {
    bank: '#60a5fa', credit_card: '#f43f5e', savings: '#10b981',
    cash: '#f59e0b', investment: '#06b6d4', person: '#a78bfa',
  }
  return map[type] || '#f59e0b'
}

export function catIcon(cat: string): string {
  const icons: Record<string, string> = {
    Food:'🍔', Grocery:'🛒', Transport:'🚗', Fuel:'⛽',
    Shopping:'🛍️', Health:'💊', Entertainment:'🎬', Bills:'⚡',
    Rent:'🏠', EMI:'🏦', Education:'📚', Travel:'✈️',
    Salary:'💰', Freelance:'💻', Investment:'📈', Other:'📌',
    Transfer:'🔄',
  }
  return icons[cat] || '📌'
}
