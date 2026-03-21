'use client'
import { useEffect } from 'react'
import { useStore } from '@/store/useStore'

export default function DataProvider({ children }: { children: React.ReactNode }) {
  const { loaded, loading, loadData } = useStore()

  useEffect(() => {
    // Skip network call if data already in store — instant navigation
    loadData()
  }, [loadData])

  // First ever load — full screen splash with animated bar
  if (!loaded) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 16,
        background: 'var(--color-bg)',
      }}>
        <div style={{ fontSize: 48 }}>💰</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 22,
          fontWeight: 800, color: 'var(--color-accent)',
        }}>
          FinLedger
        </div>
        <div style={{
          width: 120, height: 3, background: 'var(--color-border)',
          borderRadius: 2, overflow: 'hidden', marginTop: 8,
        }}>
          <div style={{
            height: '100%', background: 'var(--color-accent)',
            borderRadius: 2, animation: 'splashBar 1.4s ease-in-out infinite',
          }} />
        </div>
        <style>{`
          @keyframes splashBar {
            0%   { width: 0%;  transform: translateX(0); }
            50%  { width: 80%; transform: translateX(20%); }
            100% { width: 0%;  transform: translateX(200px); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <>
      {/* Thin top progress bar — only during background refreshes */}
      {loading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 3,
          zIndex: 9999, background: 'rgba(245,158,11,0.15)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', background: 'var(--color-accent)',
            animation: 'topBar 1.2s ease-in-out infinite',
          }} />
          <style>{`
            @keyframes topBar {
              0%   { width: 10%; margin-left: -10%; }
              50%  { width: 60%; margin-left: 30%;  }
              100% { width: 10%; margin-left: 110%; }
            }
          `}</style>
        </div>
      )}
      {children}
    </>
  )
}
