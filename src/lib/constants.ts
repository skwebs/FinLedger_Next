import type { AccountType, PersonRelationship, Category } from './types'

export const C = {
  bg: '#0b0b18',
  surface: '#111128',
  card: '#181830',
  border: '#2a2a4a',
  accent: '#f59e0b',
  text: '#f0f0ff',
  sub: '#b0b0d8',
  muted: '#7878a8',
  faint: '#454565',
  income: '#10b981',
  expense: '#f43f5e',
  transfer: '#60a5fa',
  warning: '#fb923c',
  person: '#a78bfa',
} as const

export const DEFAULT_CATS: Category[] = [
  { id: 'food',          name: 'Food',          emoji: '🍔', active: true, isDefault: true },
  { id: 'grocery',       name: 'Grocery',       emoji: '🛒', active: true, isDefault: true },
  { id: 'transport',     name: 'Transport',     emoji: '🚗', active: true, isDefault: true },
  { id: 'fuel',          name: 'Fuel',          emoji: '⛽', active: true, isDefault: true },
  { id: 'shopping',      name: 'Shopping',      emoji: '🛍️', active: true, isDefault: true },
  { id: 'health',        name: 'Health',        emoji: '💊', active: true, isDefault: true },
  { id: 'entertainment', name: 'Entertainment', emoji: '🎬', active: true, isDefault: true },
  { id: 'bills',         name: 'Bills',         emoji: '⚡', active: true, isDefault: true },
  { id: 'rent',          name: 'Rent',          emoji: '🏠', active: true, isDefault: true },
  { id: 'emi',           name: 'EMI',           emoji: '🏦', active: true, isDefault: true },
  { id: 'education',     name: 'Education',     emoji: '📚', active: true, isDefault: true },
  { id: 'travel',        name: 'Travel',        emoji: '✈️', active: true, isDefault: true },
  { id: 'salary',        name: 'Salary',        emoji: '💰', active: true, isDefault: true },
  { id: 'freelance',     name: 'Freelance',     emoji: '💻', active: true, isDefault: true },
  { id: 'investment',    name: 'Investment',    emoji: '📈', active: true, isDefault: true },
  { id: 'other',         name: 'Other',         emoji: '📌', active: true, isDefault: true },
]

// Legacy array for compatibility
export const CATS = DEFAULT_CATS.map(c => c.name)

export const COLORS = [
  '#f59e0b', '#10b981', '#60a5fa', '#a78bfa', '#f43f5e',
  '#14b8a6', '#f97316', '#06b6d4', '#e879f9', '#fb7185',
  '#84cc16', '#fbbf24',
]

export const ACC_TYPES: {
  v: AccountType; l: string; group: AccountType
  groupLabel: string; groupColor: string
}[] = [
  { v: 'bank',        l: '🏦 Bank Account',   group: 'bank',        groupLabel: '🏦 Bank Accounts',  groupColor: '#60a5fa' },
  { v: 'credit_card', l: '💳 Credit Card',    group: 'credit_card', groupLabel: '💳 Credit Cards',   groupColor: '#f43f5e' },
  { v: 'savings',     l: '🏆 Savings',        group: 'savings',     groupLabel: '🏆 Savings',        groupColor: '#10b981' },
  { v: 'cash',        l: '💵 Cash / Wallet',  group: 'cash',        groupLabel: '💵 Cash & Wallets', groupColor: '#f59e0b' },
  { v: 'investment',  l: '📈 Investment',     group: 'investment',  groupLabel: '📈 Investments',    groupColor: '#06b6d4' },
  { v: 'person',      l: '🤝 Person',         group: 'person',      groupLabel: '🤝 People',         groupColor: '#a78bfa' },
]

export const GROUP_ORDER: AccountType[] = [
  'bank', 'credit_card', 'savings', 'cash', 'investment', 'person',
]

export const RELATIONSHIP_TYPES: {
  v: PersonRelationship
  l: string
  desc: string
  incomeLbl: string
  expenseLbl: string
  balanceLbl: (b: number) => string
}[] = [
  {
    v: 'lend_borrow',
    l: '💸 Lend / Borrow',
    desc: 'Friend, family — give and take money',
    incomeLbl:  '💸 Lent to them',
    expenseLbl: '✅ Received back',
    balanceLbl: b => b > 0 ? 'They owe you' : b < 0 ? 'You owe them' : 'Settled',
  },
  {
    v: 'pay_to',
    l: '💼 Pay To',
    desc: 'Employee salary, vendor, contractor',
    incomeLbl:  '',           // not used — paying only
    expenseLbl: '💼 Paid',
    balanceLbl: b => `₹${Math.abs(b).toLocaleString('en-IN')} total paid`,
  },
  {
    v: 'receive_from',
    l: '🎓 Receive From',
    desc: 'Tuition fee, rent collected, client payment',
    incomeLbl:  '🎓 Received',
    expenseLbl: '↩️ Refunded',   // rare
    balanceLbl: b => `₹${Math.abs(b).toLocaleString('en-IN')} total received`,
  },
  {
    v: 'general',
    l: '🔄 General',
    desc: 'Flexible — mixed payments in both directions',
    incomeLbl:  '↑ Received',
    expenseLbl: '↓ Paid',
    balanceLbl: b => b > 0 ? 'Net owed to you' : b < 0 ? 'Net you owe' : 'Settled',
  },
]

export function getPersonLabels(rel: PersonRelationship | null | undefined) {
  const r = RELATIONSHIP_TYPES.find(x => x.v === rel) ?? RELATIONSHIP_TYPES[0]
  return r
}
