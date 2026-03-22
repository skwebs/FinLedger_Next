'use client'
import { useState } from 'react'
import { useStore } from '@/store/useStore'
import AppShell from '@/components/layout/AppShell'
import DataProvider from '@/components/layout/DataProvider'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { DEFAULT_CATS } from '@/lib/constants'
import type { Category } from '@/lib/types'

const EMOJI_OPTIONS = ['🍔','🛒','🚗','⛽','🛍️','💊','🎬','⚡','🏠','🏦','📚','✈️','💰','💻','📈','📌','🎮','☕','🍕','🎵','📱','🎁','🏃','💈','🌿','🐶','🏋️','🧴','🎓','💡','🔧','🏪']

function CategoriesContent() {
  const { categories, addCategory, updateCategory, deleteCategory, toggleCategory, setCategories } = useStore()
  const { toast } = useToast()
  const [addName, setAddName] = useState('')
  const [addEmoji, setAddEmoji] = useState('📌')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null) // 'add' | cat.id

  const active = categories.filter(c => c.active)
  const hidden = categories.filter(c => !c.active)

  function handleAdd() {
    if (!addName.trim()) { toast('Enter category name', 'err'); return }
    if (categories.find(c => c.name.toLowerCase() === addName.trim().toLowerCase())) {
      toast('Category already exists', 'err'); return
    }
    addCategory(addName, addEmoji)
    setAddName(''); setAddEmoji('📌')
    toast('Category added', 'ok')
  }

  function handleSaveEdit(id: string) {
    if (!editName.trim()) { toast('Enter name', 'err'); return }
    updateCategory(id, { name: editName.trim(), emoji: editEmoji })
    setEditId(null)
    toast('Updated', 'ok')
  }

  function handleDelete(cat: Category) {
    if (cat.isDefault) { toast('Default categories can only be hidden', 'err'); return }
    deleteCategory(cat.id)
    toast('Deleted', 'ok')
  }

  function handleReset() {
    setCategories(DEFAULT_CATS)
    toast('Reset to defaults', 'ok')
  }

  const btnSm: React.CSSProperties = { border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }

  function EmojiPicker({ onSelect }: { onSelect: (e: string) => void }) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 0', maxHeight: 160, overflowY: 'auto' }}>
        {EMOJI_OPTIONS.map(e => (
          <button key={e} onClick={() => onSelect(e)} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{e}</button>
        ))}
      </div>
    )
  }

  return (
    <AppShell title="Categories" showBack backHref="/dashboard">
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Add new */}
        <div className="card">
          <div className="slabel">ADD CATEGORY</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <button onClick={() => setShowEmojiPicker(showEmojiPicker === 'add' ? null : 'add')}
              style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: 22, cursor: 'pointer', flexShrink: 0 }}>
              {addEmoji}
            </button>
            <input value={addName} onChange={e => setAddName(e.target.value)}
              placeholder="Category name" onKeyDown={e => e.key === 'Enter' && handleAdd()}
              style={{ flex: 1 }} />
          </div>
          {showEmojiPicker === 'add' && <EmojiPicker onSelect={e => { setAddEmoji(e); setShowEmojiPicker(null) }} />}
          <button onClick={handleAdd} style={{ ...btnSm, background: 'var(--color-accent)', color: '#0b0b18', width: '100%', padding: '11px 0', fontSize: 14 }}>+ Add Category</button>
        </div>

        {/* Active categories */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span className="slabel">ACTIVE ({active.length})</span>
            <button onClick={handleReset} style={{ ...btnSm, background: 'var(--color-surface)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>Reset to defaults</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {active.map(cat => (
              <div key={cat.id}>
                {editId === cat.id ? (
                  <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setShowEmojiPicker(showEmojiPicker === cat.id ? null : cat.id)}
                        style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-card)', border: '1px solid var(--color-border)', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}>
                        {editEmoji}
                      </button>
                      <input value={editName} onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit(cat.id)}
                        style={{ flex: 1, height: 40 }} autoFocus />
                    </div>
                    {showEmojiPicker === cat.id && <EmojiPicker onSelect={e => { setEditEmoji(e); setShowEmojiPicker(null) }} />}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setEditId(null)} style={{ ...btnSm, flex: 1, background: 'var(--color-card)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>Cancel</button>
                      <button onClick={() => handleSaveEdit(cat.id)} style={{ ...btnSm, flex: 1, background: 'var(--color-accent)', color: '#0b0b18' }}>Save</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', borderRadius: 10 }}>
                    <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{cat.emoji}</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{cat.name}</span>
                    {cat.isDefault && <span style={{ fontSize: 10, color: 'var(--color-faint)', fontWeight: 600 }}>DEFAULT</span>}
                    <button onClick={() => { setEditId(cat.id); setEditName(cat.name); setEditEmoji(cat.emoji) }}
                      style={{ ...btnSm, background: 'var(--color-surface)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>Edit</button>
                    <button onClick={() => toggleCategory(cat.id)}
                      style={{ ...btnSm, background: 'rgba(244,63,94,.08)', color: 'var(--color-expense)', border: '1px solid rgba(244,63,94,.2)' }}>Hide</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Hidden categories */}
        {hidden.length > 0 && (
          <div className="card">
            <div className="slabel" style={{ marginBottom: 12 }}>HIDDEN ({hidden.length})</div>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 12 }}>
              Hidden categories don't appear in the Add Transaction form but old transactions keep their category.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {hidden.map(cat => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', opacity: 0.5 }}>
                  <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{cat.emoji}</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{cat.name}</span>
                  <button onClick={() => toggleCategory(cat.id)}
                    style={{ ...btnSm, background: 'rgba(16,185,129,.1)', color: 'var(--color-income)', border: '1px solid rgba(16,185,129,.25)' }}>Show</button>
                  {!cat.isDefault && (
                    <button onClick={() => handleDelete(cat)}
                      style={{ ...btnSm, background: 'rgba(244,63,94,.08)', color: 'var(--color-expense)', border: '1px solid rgba(244,63,94,.2)' }}>Delete</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default function CategoriesPage() {
  return (
    <ToastProvider>
      <DataProvider>
        <CategoriesContent />
      </DataProvider>
    </ToastProvider>
  )
}
