import type { ReactNode } from 'react'
import { formatCount } from '../lib/format'

/** A horizontal bar for a single value in a table row. */
export function HBar({
  value,
  max,
  tone = 'neutral',
  width = 'w-28',
}: {
  value: number | null
  max: number
  tone?: 'neutral' | 'maroon' | 'gold' | 'ok' | 'bad' | 'steel'
  width?: string
}) {
  const tones = {
    neutral: 'bg-ink-4',
    maroon: 'bg-maroon',
    gold: 'bg-gold',
    ok: 'bg-ok',
    bad: 'bg-bad',
    steel: 'bg-steel',
  } as const
  const pct =
    value === null || !Number.isFinite(value) || max <= 0
      ? 0
      : Math.max(1.5, Math.min(100, (value / max) * 100))
  return (
    <span
      className={`inline-block h-[6px] ${width} overflow-hidden rounded-full bg-rowline align-middle`}
    >
      <span className={`block h-full rounded-full ${tones[tone]}`} style={{ width: `${pct}%` }} />
    </span>
  )
}

export interface Series {
  key: string
  label: string
  /** A Tailwind background class. */
  className: string
}

export interface Column {
  label: string
  /** Short label for the axis; omitted labels are not drawn. */
  axisLabel?: string
  values: Record<string, number | null>
  title?: string
}

/**
 * Columns drawn with plain elements — no chart library. `stacked` sums the
 * series in one column; `grouped` puts them side by side.
 */
export function ColumnChart({
  columns,
  series,
  mode = 'stacked',
  height = 150,
  ticks = 4,
  formatTick = formatCount,
  footer,
}: {
  columns: Column[]
  series: Series[]
  mode?: 'stacked' | 'grouped'
  height?: number
  ticks?: number
  formatTick?: (value: number) => string
  footer?: ReactNode
}) {
  const totals = columns.map((column) =>
    mode === 'stacked'
      ? series.reduce((sum, s) => sum + (column.values[s.key] ?? 0), 0)
      : Math.max(...series.map((s) => column.values[s.key] ?? 0), 0),
  )
  const peak = Math.max(...totals, 0)
  // A rounded ceiling keeps the gridline labels legible.
  const magnitude = peak <= 0 ? 1 : 10 ** Math.floor(Math.log10(peak))
  const ceiling = peak <= 0 ? 1 : Math.ceil(peak / (magnitude / 2)) * (magnitude / 2)
  const lines = Array.from({ length: ticks + 1 }, (_, i) => (ceiling / ticks) * i).reverse()

  return (
    <div>
      <div className="flex gap-2">
        <div
          className="tnum flex w-10 shrink-0 flex-col justify-between text-right text-[10px] text-ink-4"
          style={{ height }}
        >
          {lines.map((line) => (
            <span key={line} className="-translate-y-[5px] leading-none">
              {formatTick(Math.round(line))}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1" style={{ height }}>
          {lines.map((line, i) => (
            <span
              key={line}
              className="absolute inset-x-0 border-t border-rowline"
              style={{ top: `${(i / ticks) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {columns.map((column, index) => (
              <div
                key={`${column.label}-${index}`}
                title={
                  column.title ??
                  `${column.label}\n${series
                    .map((s) => `${s.label}: ${formatCount(column.values[s.key] ?? 0)}`)
                    .join('\n')}`
                }
                className={`flex h-full min-w-0 flex-1 items-end ${
                  mode === 'grouped' ? 'gap-[1px]' : 'flex-col justify-end'
                }`}
              >
                {mode === 'stacked'
                  ? series
                      .map((s) => ({ s, value: column.values[s.key] ?? 0 }))
                      .reverse()
                      .map(({ s, value }) => (
                        <span
                          key={s.key}
                          className={`w-full ${s.className}`}
                          style={{
                            height: `${ceiling > 0 ? (value / ceiling) * 100 : 0}%`,
                          }}
                        />
                      ))
                  : series.map((s) => {
                      const value = column.values[s.key]
                      return (
                        <span
                          key={s.key}
                          className={`min-w-0 flex-1 ${s.className}`}
                          style={{
                            height:
                              value === null || ceiling <= 0
                                ? '0%'
                                : `${(value / ceiling) * 100}%`,
                          }}
                        />
                      )
                    })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex gap-2 pl-12">
        <div className="flex min-w-0 flex-1 gap-[2px]">
          {columns.map((column, index) => (
            <div
              key={`${column.label}-axis-${index}`}
              className="min-w-0 flex-1 text-center text-[9px] leading-tight text-ink-4"
            >
              {column.axisLabel ?? ''}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 pl-12">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-ink-3">
            <span className={`size-2.5 rounded-[2px] ${s.className}`} />
            {s.label}
          </span>
        ))}
        {footer}
      </div>
    </div>
  )
}
