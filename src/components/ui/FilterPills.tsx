'use client'

interface PillProps {
  label: string
  active: boolean
  onClick: () => void
}

export function Pill({ label, active, onClick }: PillProps) {
  return (
    <div
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: '7px 14px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        transition: 'all .18s',
        border: active ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
        background: active ? 'var(--color-accent)' : 'var(--color-surface)',
        color: active ? '#0b0b18' : 'var(--color-muted)',
      }}
    >
      {label}
    </div>
  )
}

interface FilterPillsProps {
  options: { value: string; label: string }[]
  active: string
  onChange: (value: string) => void
}

export default function FilterPills({ options, active, onChange }: FilterPillsProps) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      paddingBottom: 2,
      scrollbarWidth: 'none',
    }}>
      {options.map(opt => (
        <Pill
          key={opt.value}
          label={opt.label}
          active={active === opt.value}
          onClick={() => onChange(opt.value)}
        />
      ))}
    </div>
  )
}
