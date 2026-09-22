import type { ReactNode } from 'react'

export type PillTone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'gold' | 'muted'

const TONES: Record<PillTone, string> = {
  neutral: 'bg-sunken text-ink-3 border-line',
  ok: 'bg-ok-bg text-ok border-transparent',
  warn: 'bg-warn-bg text-warn border-gold-border',
  bad: 'bg-bad-bg text-bad border-transparent',
  info: 'bg-info-bg text-info border-transparent',
  gold: 'bg-gold-tint text-gold-ink border-gold-border',
  muted: 'bg-sunken text-ink-4 border-dashed border-line-strong',
}

/** Full pills for status. Colour is reserved; default to neutral. */
export function StatusPill({
  children,
  tone = 'neutral',
  title,
  mono = false,
}: {
  children: ReactNode
  tone?: PillTone
  title?: string
  mono?: boolean
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-[1px] text-[11px] font-medium ${
        mono ? 'font-mono' : ''
      } ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}

/** A short tracked-out eyebrow label. The only place uppercase is used. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-4">
      {children}
    </div>
  )
}

/** Monospace for ids, digests, codes and enum values. */
export function Mono({
  children,
  className = '',
  title,
}: {
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <span title={title} className={`font-mono text-[11px] ${className}`}>
      {children}
    </span>
  )
}
