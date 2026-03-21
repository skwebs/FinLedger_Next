import type { AccountType } from './types'

export const CATS = [
  'Food','Grocery','Transport','Fuel','Shopping','Health',
  'Entertainment','Bills','Rent','EMI','Education','Travel',
  'Salary','Freelance','Investment','Other',
]

export const ICONS: Record<string, string> = {
  Food:'🍔', Grocery:'🛒', Transport:'🚗', Fuel:'⛽',
  Shopping:'🛍️', Health:'💊', Entertainment:'🎬', Bills:'⚡',
  Rent:'🏠', EMI:'🏦', Education:'📚', Travel:'✈️',
  Salary:'💰', Freelance:'💻', Investment:'📈', Other:'📌',
  Transfer:'🔄', Person:'🤝',
}

export const COLORS = [
  '#f59e0b','#10b981','#60a5fa','#a78bfa','#f43f5e',
  '#14b8a6','#f97316','#06b6d4','#e879f9','#fb7185',
  '#84cc16','#fbbf24',
]

export const ACC_TYPES: {
  v: AccountType; l: string; group: AccountType
  groupLabel: string; groupColor: string
}[] = [
  { v:'bank',        l:'🏦 Bank Account',   group:'bank',        groupLabel:'🏦 Bank Accounts',  groupColor:'#60a5fa' },
  { v:'credit_card', l:'💳 Credit Card',    group:'credit_card', groupLabel:'💳 Credit Cards',   groupColor:'#f43f5e' },
  { v:'savings',     l:'🏆 Savings',        group:'savings',     groupLabel:'🏆 Savings',        groupColor:'#10b981' },
  { v:'cash',        l:'💵 Cash / Wallet',  group:'cash',        groupLabel:'💵 Cash & Wallets', groupColor:'#f59e0b' },
  { v:'investment',  l:'📈 Investment',     group:'investment',  groupLabel:'📈 Investments',    groupColor:'#06b6d4' },
  { v:'person',      l:'🤝 Person',         group:'person',      groupLabel:'🤝 People',         groupColor:'#a78bfa' },
]

export const GROUP_ORDER: AccountType[] = [
  'bank','credit_card','savings','cash','investment','person',
]

export const PERSON_LABELS = {
  income:  '💸 Lent / Paid for them',
  expense: '✅ Received / They repaid',
}
