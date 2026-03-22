'use client'
import { create } from 'zustand'
import type { Account, Transaction, Category } from '@/lib/types'
import { DEFAULT_CATS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'

const CATS_KEY = 'fl_categories'

function loadCats(): Category[] {
  try {
    const s = localStorage.getItem(CATS_KEY)
    if (s) return JSON.parse(s)
  } catch { /**/ }
  return DEFAULT_CATS
}

function saveCats(cats: Category[]) {
  try { localStorage.setItem(CATS_KEY, JSON.stringify(cats)) } catch { /**/ }
}

interface Store {
  accounts: Account[]
  transactions: Transaction[]
  categories: Category[]
  loaded: boolean
  loading: boolean
  userId: string | null
  month: string
  loadData: (force?: boolean) => Promise<void>
  setMonth: (m: string) => void
  addAccount: (data: Omit<Account, 'id' | 'user_id' | 'created_at'>) => Promise<Account>
  updateAccount: (id: string, data: Partial<Account>) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  addTransaction: (data: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) => Promise<Transaction>
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  bulkDeleteTransactions: (ids: string[]) => Promise<void>
  recalcBalances: () => Promise<void>
  // Categories
  setCategories: (cats: Category[]) => void
  addCategory: (name: string, emoji: string) => void
  updateCategory: (id: string, patch: Partial<Category>) => void
  deleteCategory: (id: string) => void
  toggleCategory: (id: string) => void
  reorderCategories: (cats: Category[]) => void
}

const db = () => createClient()

async function applyBalance(accounts: Account[], tx: Transaction, sign: 1 | -1): Promise<Account[]> {
  const updated = [...accounts]
  const supabase = db()
  const acc = updated.find(a => a.id === tx.account_id)
  if (acc) {
    acc.balance += (tx.type === 'income' ? tx.amount : -tx.amount) * sign
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
  categories: typeof window !== 'undefined' ? loadCats() : DEFAULT_CATS,
  loaded: false,
  loading: false,
  userId: null,
  month: new Date().toISOString().slice(0, 7),

  setMonth: m => set({ month: m }),

  loadData: async (force = false) => {
    if (get().loaded && !force) return
    set({ loading: true })
    const supabase = db()
    const { data: { user } } = await supabase.auth.getUser()
    const [ar, tr] = await Promise.all([
      supabase.from('accounts').select('*').order('created_at', { ascending: true }),
      supabase.from('transactions').select('*').order('txn_at', { ascending: false }),
    ])
    set({
      userId: user?.id || null,
      accounts: (ar.data || []) as Account[],
      transactions: (tr.data || []) as Transaction[],
      loaded: true,
      loading: false,
      categories: loadCats(),
    })
  },

  addAccount: async data => {
    const supabase = db()
    const userId = get().userId
    if (!userId) throw new Error('Not authenticated')
    const { data: rows, error } = await supabase.from('accounts').insert([{ ...data, user_id: userId }]).select()
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

  deleteAccount: async id => {
    const supabase = db()
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) throw error
    set(s => ({ accounts: s.accounts.filter(a => a.id !== id), transactions: s.transactions.filter(t => t.account_id !== id && t.to_account_id !== id) }))
  },

  addTransaction: async data => {
    const supabase = db()
    const userId = get().userId
    if (!userId) throw new Error('Not authenticated')
    const { data: rows, error } = await supabase.from('transactions').insert([{ ...data, user_id: userId }]).select()
    if (error) throw error
    const tx = rows[0] as Transaction
    const updated = await applyBalance(get().accounts, tx, 1)
    set(s => ({
      accounts: updated,
      transactions: [tx, ...s.transactions].sort((a, b) => new Date(b.txn_at).getTime() - new Date(a.txn_at).getTime()),
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
      transactions: s.transactions.map(t => t.id === id ? updated : t)
        .sort((a, b) => new Date(b.txn_at).getTime() - new Date(a.txn_at).getTime()),
    }))
  },

  deleteTransaction: async id => {
    const tx = get().transactions.find(t => t.id === id)
    if (!tx) return
    const afterReverse = await applyBalance(get().accounts, tx, -1)
    const supabase = db()
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
    set(s => ({ accounts: afterReverse, transactions: s.transactions.filter(t => t.id !== id) }))
  },

  bulkDeleteTransactions: async ids => {
    if (!ids.length) return
    const supabase = db()
    let accounts = get().accounts
    const txns = get().transactions.filter(t => ids.includes(t.id))
    for (const tx of txns) accounts = await applyBalance(accounts, tx, -1)
    const { error } = await supabase.from('transactions').delete().in('id', ids)
    if (error) throw error
    set(s => ({ accounts, transactions: s.transactions.filter(t => !ids.includes(t.id)) }))
  },

  recalcBalances: async () => {
    const { accounts, transactions } = get()
    const updated = accounts.map(a => ({ ...a, balance: 0 }))
    const sorted = [...transactions].sort((a, b) => new Date(a.txn_at).getTime() - new Date(b.txn_at).getTime())
    sorted.forEach(tx => {
      const acc = updated.find(a => a.id === tx.account_id)
      if (acc) acc.balance += tx.type === 'income' ? tx.amount : -tx.amount
      if (tx.type === 'transfer' && tx.to_account_id) {
        const to = updated.find(a => a.id === tx.to_account_id)
        if (to) to.balance += tx.amount
      }
    })
    const supabase = db()
    await Promise.all(updated.map(a => supabase.from('accounts').update({ balance: a.balance }).eq('id', a.id)))
    set({ accounts: updated })
  },

  setCategories: cats => { saveCats(cats); set({ categories: cats }) },

  addCategory: (name, emoji) => {
    const cats = get().categories
    const newCat: Category = { id: `c_${Date.now()}`, name: name.trim(), emoji, active: true, isDefault: false }
    const updated = [...cats, newCat]
    saveCats(updated); set({ categories: updated })
  },

  updateCategory: (id, patch) => {
    const updated = get().categories.map(c => c.id === id ? { ...c, ...patch } : c)
    saveCats(updated); set({ categories: updated })
  },

  deleteCategory: id => {
    const cat = get().categories.find(c => c.id === id)
    if (cat?.isDefault) return // default categories can only be hidden
    const updated = get().categories.filter(c => c.id !== id)
    saveCats(updated); set({ categories: updated })
  },

  toggleCategory: id => {
    const updated = get().categories.map(c => c.id === id ? { ...c, active: !c.active } : c)
    saveCats(updated); set({ categories: updated })
  },

  reorderCategories: cats => { saveCats(cats); set({ categories: cats }) },
}))
