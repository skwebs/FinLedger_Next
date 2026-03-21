'use client'
import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import Spinner from '@/components/ui/Spinner'

export default function DataProvider({ children }: { children: React.ReactNode }) {
  const { loaded, loadData } = useStore()

  useEffect(() => { loadData() }, [loadData])

  if (!loaded) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 36 }}>💰</div>
        <Spinner />
      </div>
    )
  }
  return <>{children}</>
}
