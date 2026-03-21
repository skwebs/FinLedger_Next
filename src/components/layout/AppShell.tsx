'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'HOME', icon: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} width={20} height={20}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  )},
  { href: '/accounts', label: 'ACCOUNTS', icon: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} width={20} height={20}>
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  )},
  { href: '/transactions', label: 'ALL TXNS', icon: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} width={20} height={20}>
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <circle cx="3" cy="6" r="1.5" fill="currentColor"/><circle cx="3" cy="12" r="1.5" fill="currentColor"/><circle cx="3" cy="18" r="1.5" fill="currentColor"/>
    </svg>
  )},
  { href: '/reports', label: 'REPORTS', icon: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} width={20} height={20}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )},
  { href: '/bot', label: 'BOT', icon: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} width={20} height={20}>
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <polyline points="2,4 12,13 22,4"/>
    </svg>
  )},
]

interface AppShellProps {
  children: React.ReactNode
  title: string
  showBack?: boolean
  backHref?: string
  headerRight?: React.ReactNode
  showFab?: boolean
  onFab?: () => void
}

export default function AppShell({
  children, title, showBack, backHref = '/accounts',
  headerRight, showFab = true, onFab,
}: AppShellProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(11,11,24,0.95)', backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid var(--color-border)',
        padding: '10px 14px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 8, minHeight: 54,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {showBack && (
            <Link href={backHref} style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 10, color: 'var(--color-text)', width: 34, height: 34,
              fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, textDecoration: 'none',
            }}>‹</Link>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 9, color: 'var(--color-muted)', fontWeight: 700, letterSpacing: '1.4px' }}>FINLEDGER</div>
            <div className="hd" style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </div>
          </div>
        </div>
        {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
      </div>

      {/* Main content */}
      <main style={{ padding: `12px 14px calc(74px + env(safe-area-inset-bottom, 0px) + 14px)` }}>
        {children}
      </main>

      {/* FAB */}
      {showFab && onFab && (
        <button onClick={onFab} style={{
          position: 'fixed', bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 12px)',
          right: 16, width: 52, height: 52, background: 'var(--color-accent)',
          borderRadius: '50%', border: 'none', color: '#0b0b18', fontSize: 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(245,158,11,0.5)', zIndex: 90,
          transition: 'transform 0.15s', cursor: 'pointer',
        }}>+</button>
      )}

      {/* Bottom nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)', display: 'flex', zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {NAV_ITEMS.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '8px 2px 6px',
              color: active ? 'var(--color-accent)' : 'var(--color-muted)',
              fontSize: 9, fontWeight: 700, gap: 3, letterSpacing: '0.3px',
              textDecoration: 'none', transition: 'color 0.2s',
            }}>
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
