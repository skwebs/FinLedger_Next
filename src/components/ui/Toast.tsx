'use client'
import { useState, useCallback, createContext, useContext } from 'react'

type ToastType = 'ok' | 'err' | 'info'
interface ToastItem { id: number; msg: string; type: ToastType }
interface ToastCtx { toast: (msg: string, type?: ToastType) => void }

const ToastContext = createContext<ToastCtx>({ toast: () => {} })
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((msg: string, type: ToastType = 'info') => {
    const id = Date.now()
    setItems(p => [...p, { id, msg, type }])
    setTimeout(() => setItems(p => p.filter(i => i.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 400, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        {items.map(item => (
          <div key={item.id} style={{
            background: 'var(--color-card)', border: `1px solid ${item.type === 'err' ? 'rgba(244,63,94,.4)' : item.type === 'ok' ? 'rgba(16,185,129,.4)' : 'var(--color-border)'}`,
            borderRadius: 12, padding: '10px 18px', fontSize: 13, fontWeight: 600,
            whiteSpace: 'nowrap', maxWidth: 'calc(100vw - 32px)', animation: 'fadeUp .28s ease',
          }}>
            {item.type === 'err' ? '❌ ' : item.type === 'ok' ? '✅ ' : 'ℹ️ '}{item.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
