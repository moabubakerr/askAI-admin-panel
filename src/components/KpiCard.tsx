import type { ReactNode } from 'react'
import { Eyebrow } from './StatusPill'

/**
 * Two emphasised cards lead the Overview (maroon and gold top stripes); the
 * rest are neutral tiles. The stripe is the only decoration.
 */
export function KpiCard({
  label,
  value,
  unit,
  stripe,
  children,
  note,
}: {
  label: string
  value: string
  unit?: string
  stripe?: 'maroon' | 'gold'
  children?: ReactNode
  note?: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[10px] border border-line bg-surface">
      {stripe && (
        <div className={`h-[3px] ${stripe === 'maroon' ? 'bg-maroon' : 'bg-gold'}`} />
      )}
      <div className="p-3.5">
        <Eyebrow>{label}</Eyebrow>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span
            className={`tnum font-semibold tracking-tight text-ink-1 ${
              stripe ? 'text-[30px] leading-8' : 'text-[21px] leading-6'
            }`}
          >
            {value}
          </span>
          {unit && <span className="text-[12px] text-ink-3">{unit}</span>}
        </div>
        {note && <div className="mt-1 text-[11px] leading-snug text-ink-3">{note}</div>}
        {children && <div className="mt-3">{children}</div>}
      </div>
    </section>
  )
}

/** A plain bordered panel with an optional header row. */
export function Panel({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-[10px] border border-line bg-surface ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-2.5">
          <div className="min-w-0">
            {title && <h2 className="text-[13px] font-semibold text-ink-1">{title}</h2>}
            {subtitle && (
              <p className="mt-0.5 text-[11px] leading-snug text-ink-3">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
