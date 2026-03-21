'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function Modal({ open, onClose, children }: ModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open || !mounted) return null

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      justifyContent: 'flex-end', alignItems: 'center',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />
      {/* Sheet */}
      <div style={{
        position: 'relative',
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '24px 24px 0 0',
        width: '100%',
        maxWidth: 480,
        maxHeight: '92dvh',
        overflowY: 'auto',
        padding: '0 20px calc(24px + env(safe-area-inset-bottom, 0px))',
        animation: 'fadeUp 0.2s ease',
        zIndex: 1,
      }}>
        <div style={{
          width: 40, height: 4,
          background: 'var(--color-border)',
          borderRadius: 2,
          margin: '14px auto 18px',
        }} />
        {children}
      </div>
    </div>,
    document.body
  )
}
