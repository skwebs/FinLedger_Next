'use client'
import { create } from 'zustand'
import type { Account, Transaction } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface Store {
  accounts: Account[]
  transactions: Transaction[]
  loaded: boolean
  month: string
  // Actions
  loadData: () => Promise<void>
  setMonth: (m: string) => void
  addAccount: (data: Omit<Account, 'id' | 'user_id' | 'created_at'>) => Promise<Account>
  updateAccount: (id: string, data: Partial<Account>) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  addTransaction: (data: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) => Promise<Transaction>
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  recalcBalances: () => Promise<void>
}

const db = () => createClient()

async function applyBalance(
  accounts: Account[],
  tx: Transaction,
  sign: 1 | -1
): Promise<Account[]> {
  const updated = [...accounts]
  const supabase = db()

  const acc = updated.find(a => a.id === tx.account_id)
  if (acc) {
    const delta = (tx.type === 'income' ? tx.amount : -tx.amount) * sign
    acc.balance += delta
    await supabase.from('accounts').update({ balance: acc.balance }).eq('id', acc.id)
  }

  if (tx.type === 'transfer' && tx.to_account_id) {
    const toAcc = updated.find(a => a.id === tx.to_account_id)
    if (toAcc) {
      toAcc.balance += tx.amount * sign
      await supabase.from('accounts').update({ balance: toAcc.balance }).eq('id', toAcc.id)
    }
  }
  return updated
}

export const useStore = create<Store>((set, get) => ({
  accounts: [],
  transactions: [],
  loaded: false,
  month: new Date().toISOString().slice(0, 7),

  setMonth: (m) => set({ month: m }),

  loadData: async () => {
    const supabase = db()
    const [ar, tr] = await Promise.all([
      supabase.from('accounts').select('*').order('created_at', { ascending: true }),
      supabase.from('transactions').select('*').order('txn_at', { ascending: false }),
    ])
    set({
      accounts: (ar.data || []) as Account[],
      transactions: (tr.data || []) as Transaction[],
      loaded: true,
    })
  },

  addAccount: async (data) => {
    const supabase = db()
    const { data: rows, error } = await supabase.from('accounts').insert([data]).select()
    if (error) throw error
    const acc = rows[0] as Account
    set(s => ({ accounts: [...s.accounts, acc] }))
    return acc
  },

  updateAccount: async (id, data) => {
    const supabase = db()
    const { data: rows, error } = await supabase.from('accounts').update(data).eq('id', id).select()
    if (error) throw error
    set(s => ({ accounts: s.accounts.map(a => a.id === id ? rows[0] as Account : a) }))
  },

  deleteAccount: async (id) => {
    const supabase = db()
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) throw error
    set(s => ({
      accounts: s.accounts.filter(a => a.id !== id),
      transactions: s.transactions.filter(t => t.account_id !== id && t.to_account_id !== id),
    }))
  },

  addTransaction: async (data) => {
    const supabase = db()
    const { data: rows, error } = await supabase.from('transactions').insert([data]).select()
    if (error) throw error
    const tx = rows[0] as Transaction
    const updated = await applyBalance(get().accounts, tx, 1)
    set(s => ({
      accounts: updated,
      transactions: [tx, ...s.transactions].sort(
        (a, b) => new Date(b.txn_at).getTime() - new Date(a.txn_at).getTime()
      ),
    }))
    return tx
  },

  updateTransaction: async (id, newData) => {
    const old = get().transactions.find(t => t.id === id)
    if (!old) throw new Error('Transaction not found')
    const afterReverse = await applyBalance(get().accounts, old, -1)
    const supabase = db()
    const { data: rows, error } = await supabase.from('transactions').update(newData).eq('id', id).select()
    if (error) throw error
    const updated = rows[0] as Transaction
    const afterApply = await applyBalance(afterReverse, updated, 1)
    set(s => ({
      accounts: afterApply,
      transactions: s.transactions
        .map(t => t.id === id ? updated : t)
        .sort((a, b) => new Date(b.txn_at).getTime() - new Date(a.txn_at).getTime()),
    }))
  },

  deleteTransaction: async (id) => {
    const tx = get().transactions.find(t => t.id === id)
    if (!tx) return
    const afterReverse = await applyBalance(get().accounts, tx, -1)
    const supabase = db()
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
    set(s => ({
      accounts: afterReverse,
      transactions: s.transactions.filter(t => t.id !== id),
    }))
  },

  recalcBalances: async () => {
    const { accounts, transactions } = get()
    const updated = accounts.map(a => ({ ...a, balance: 0 }))
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.txn_at).getTime() - new Date(b.txn_at).getTime()
    )
    sorted.forEach(tx => {
      const acc = updated.find(a => a.id === tx.account_id)
      if (acc) acc.balance += tx.type === 'income' ? tx.amount : -tx.amount
      if (tx.type === 'transfer' && tx.to_account_id) {
        const toAcc = updated.find(a => a.id === tx.to_account_id)
        if (toAcc) toAcc.balance += tx.amount
      }
    })
    const supabase = db()
    await Promise.all(updated.map(a =>
      supabase.from('accounts').update({ balance: a.balance }).eq('id', a.id)
    ))
    set({ accounts: updated })
  },
}))
