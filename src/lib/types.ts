export type AccountType = 'bank' | 'credit_card' | 'savings' | 'cash' | 'investment' | 'person'

export type PersonRelationship = 'lend_borrow' | 'pay_to' | 'receive_from' | 'general'

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  balance: number
  currency: string
  billing_day: number | null
  credit_limit: number | null
  color: string
  relationship_type: PersonRelationship | null
  created_at: string
}

export type TxType = 'expense' | 'income' | 'transfer'

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  amount: number
  type: TxType
  category: string
  description: string
  txn_at: string
  to_account_id: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  emoji: string
  active: boolean
  isDefault: boolean
}

export interface AccountFormData {
  name: string
  type: AccountType
  balance: number
  currency: string
  billing_day: number | null
  credit_limit: number | null
  color: string
  relationship_type: PersonRelationship | null
}

export interface TxFormData {
  account_id: string
  amount: number
  type: TxType
  category: string
  description: string
  txn_at: string
  to_account_id: string | null
}

export interface ImportRow {
  _id: string
  _sel: boolean
  description: string
  amount: number
  type: TxType
  category: string
  date: string
  time: string
  accId: string
}
