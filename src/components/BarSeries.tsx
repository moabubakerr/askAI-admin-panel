import { useId, useState, type ReactNode } from 'react'
import { formatCount } from '../lib/format'
import { useEnterTransition } from '../lib/motion'

/**
 * Charts are drawn with plain elements — no chart library.
 *
 * Mark specs held to throughout: columns capped at 24px so the band keeps its
 * air, a 4px rounded data-end square at the baseline, a 2px surface gap between
 * touching marks, hairline solid gridlines, and text in ink tokens rather than
 * the series colour.
 *
 * The series colours are the validated pair — see SERIES_* below.
 */

/**
 * Categorical slot 1. The brand maroon #8a1538 is too dark for a chart fill
 * (outside the lightness band), so this is the nearest passing step of the same
 * hue. Validated against slot 2: CVD ΔE 14.2, normal-vision ΔE 23.7.
 */
export const SERIES_REFUSALS = '#b03258'
/** Categorical slot 2. The previous steel #46617f read as grey — below the chroma floor. */
export const SERIES_ANSWERED = '#4a7fb5'

/** Actual against target: the measured series carries the colour. */
export const SERIES_ACTUAL = '#b03258'
/**
 * Target is deliberately a neutral: it is a reference the actual is read
 * against, not a peer series competing for attention. That means it fails the
 * chroma floor on purpose; CVD separation (ΔE 11.8) and contrast (>= 3:1) both
 * pass, and the legend names both series so identity is never colour-alone.
 */
export const SERIES_TARGET = '#7e8b9a'

const BAR_TONES = {
  neutral: 'bg-ink-4',
  maroon: 'bg-maroon',
  gold: 'bg-gold',
  ok: 'bg-ok',
  bad: 'bg-bad',
  steel: 'bg-steel',
} as const

/** A horizontal bar for a single value in a table row. */
export function HBar({
  value,
  max,
  tone = 'neutral',
  width = 'w-28',
  thick = false,
}: {
  value: number | null
  max: number
  tone?: keyof typeof BAR_TONES
  width?: string
  /** Distribution rows carry a little more weight than in-table bars. */
  thick?: boolean
}) {
  const { entered, reduced } = useEnterTransition()
  const pct =
    value === null || !Number.isFinite(value) || max <= 0
      ? 0
      : Math.max(1.5, Math.min(100, (value / max) * 100))

  return (
    <span
      className={`inline-block ${thick ? 'h-[9px]' : 'h-[6px]'} ${width} overflow-hidden rounded-full bg-rowline align-middle`}
    >
      <span
        className={`block h-full rounded-full ${BAR_TONES[tone]}`}
        style={{
          width: `${entered ? pct : 0}%`,
          transition: reduced ? undefined : 'width 520ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </span>
  )
}

export interface Series {
  key: string
  label: string
  /** A CSS colour, so the same value drives the mark, the legend and the key. */
  color: string
}

export interface Column {
  label: string
  /** Short label for the axis; omitted labels are not drawn. */
  axisLabel?: string
  values: Record<string, number | null>
}

/**
 * Columns with a real hover layer. On bars the mark is the hit target, so each
 * column carries its own pointer and focus handling rather than a crosshair,
 * and the hovered column lifts so the reader sees it respond.
 */
export function ColumnChart({
  columns,
  series,
  mode = 'stacked',
  height = 150,
  ticks = 4,
  formatValue = formatCount,
  unitLabel,
  caption,
}: {
  columns: Column[]
  series: Series[]
  mode?: 'stacked' | 'grouped'
  height?: number
  ticks?: number
  formatValue?: (value: number) => string
  /** Named in the tooltip heading, e.g. "messages". */
  unitLabel?: string
  /** Screen-reader description of what the chart plots. */
  caption: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const { entered, reduced } = useEnterTransition()
  const tableId = useId()

  const totals = columns.map((column) =>
    mode === 'stacked'
      ? series.reduce((sum, s) => sum + (column.values[s.key] ?? 0), 0)
      : Math.max(...series.map((s) => column.values[s.key] ?? 0), 0),
  )
  const peak = Math.max(...totals, 0)
  const magnitude = peak <= 0 ? 1 : 10 ** Math.floor(Math.log10(peak))
  const ceiling = peak <= 0 ? 1 : Math.ceil(peak / (magnitude / 2)) * (magnitude / 2)
  const lines = Array.from({ length: ticks + 1 }, (_, i) => (ceiling / ticks) * i).reverse()

  const activeColumn = active === null ? null : columns[active]
  // Label the extreme once. Several columns can tie at the peak, and a
  // repeated number reads as two different facts.
  const peakIndex = peak > 0 ? totals.indexOf(peak) : -1

  return (
    <div>
      <div className="relative flex gap-2">
        {/* Axis ticks are a column of numbers, so they stay tabular. */}
        <div
          className="tnum flex w-10 shrink-0 flex-col justify-between text-right text-[10px] text-ink-4"
          style={{ height }}
        >
          {lines.map((line) => (
            <span key={line} className="-translate-y-[5px] leading-none">
              {formatValue(Math.round(line))}
            </span>
          ))}
        </div>

        <div
          className="relative min-w-0 flex-1"
          style={{ height }}
          onPointerLeave={() => setActive(null)}
        >
          {lines.map((line, i) => (
            <span
              key={line}
              aria-hidden
              className="absolute inset-x-0 border-t border-line"
              style={{ top: `${(i / ticks) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end">
            {columns.map((column, index) => {
              const isActive = active === index
              return (
                <div
                  key={`${column.label}-${index}`}
                  tabIndex={0}
                  role="img"
                  aria-label={`${column.label}: ${series
                    .map((s) => `${formatValue(column.values[s.key] ?? 0)} ${s.label}`)
                    .join(', ')}`}
                  onPointerEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  // The hit target is the whole band, wider than the painted mark.
                  className="group relative flex h-full min-w-0 flex-1 cursor-default items-end justify-center outline-none"
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 right-0 bg-ink-1/4"
                    />
                  )}

                  <div
                    className={`relative flex h-full w-full max-w-[24px] items-end ${
                      mode === 'grouped' ? 'gap-[2px]' : 'flex-col justify-end gap-[2px]'
                    }`}
                    style={{
                      transform: isActive && !reduced ? 'translateY(-2px)' : undefined,
                      transition: reduced ? undefined : 'transform 140ms ease-out',
                    }}
                  >
                    {mode === 'stacked'
                      ? series
                          .map((s, order) => ({ s, order, value: column.values[s.key] ?? 0 }))
                          .reverse()
                          .map(({ s, value }, stackIndex) => (
                            <span
                              key={s.key}
                              className="w-full"
                              style={{
                                height: `${
                                  entered && ceiling > 0 ? (value / ceiling) * 100 : 0
                                }%`,
                                background: s.color,
                                // 4px rounded data-end, square at the baseline.
                                borderRadius: stackIndex === 0 ? '3px 3px 0 0' : 0,
                                opacity: active === null || isActive ? 1 : 0.55,
                                transition: reduced
                                  ? undefined
                                  : `height 560ms cubic-bezier(0.22, 1, 0.36, 1) ${
                                      Math.min(index * 9, 220)
                                    }ms, opacity 140ms ease-out`,
                              }}
                            />
                          ))
                      : series.map((s) => {
                          const value = column.values[s.key]
                          return (
                            <span
                              key={s.key}
                              className="min-w-0 flex-1"
                              style={{
                                height:
                                  value === null || ceiling <= 0 || !entered
                                    ? '0%'
                                    : `${(value / ceiling) * 100}%`,
                                background: s.color,
                                borderRadius: '3px 3px 0 0',
                                opacity: active === null || isActive ? 1 : 0.55,
                                transition: reduced
                                  ? undefined
                                  : `height 560ms cubic-bezier(0.22, 1, 0.36, 1) ${
                                      Math.min(index * 9, 220)
                                    }ms, opacity 140ms ease-out`,
                              }}
                            />
                          )
                        })}
                  </div>

                  {/* Label the extreme only — never a number on every column. */}
                  {mode === 'stacked' && index === peakIndex && (
                    <span className="tnum pointer-events-none absolute -top-[15px] text-[10px] font-medium text-ink-3">
                      {formatValue(peak)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {activeColumn && (
            <Tooltip
              index={active!}
              count={columns.length}
              column={activeColumn}
              series={series}
              formatValue={formatValue}
              unitLabel={unitLabel}
            />
          )}
        </div>
      </div>

      <div className="mt-1.5 flex gap-2 pl-12">
        <div className="flex min-w-0 flex-1">
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

      {/* A legend is always present for two or more series. */}
      {series.length > 1 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 pl-12">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-ink-3">
              <span
                aria-hidden
                className="size-2.5 rounded-[2px]"
                style={{ background: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      )}

      {/* Every value the tooltip shows stays reachable without hovering. */}
      <table id={tableId} className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {columns.map((column, index) => (
            <tr key={`${column.label}-row-${index}`}>
              <th scope="row">{column.label}</th>
              {series.map((s) => (
                <td key={s.key}>{formatValue(column.values[s.key] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Values lead, series names follow, and each row is keyed by a short stroke. */
function Tooltip({
  index,
  count,
  column,
  series,
  formatValue,
  unitLabel,
}: {
  index: number
  count: number
  column: Column
  series: Series[]
  formatValue: (value: number) => string
  unitLabel?: string
}) {
  const centre = ((index + 0.5) / count) * 100
  // Keep the panel inside the plot rather than letting it overflow the card.
  const clamped = Math.min(Math.max(centre, 12), 88)

  return (
    <div
      role="status"
      // Anchored inside the plot: floating above it overflowed the card and
      // covered the panel title.
      className="pointer-events-none absolute top-1 z-10 w-max min-w-[132px] -translate-x-1/2 rounded-[7px] border border-line-strong bg-surface px-2.5 py-2 shadow-menu"
      style={{ left: `${clamped}%` }}
    >
      <div className="text-[11px] font-medium text-ink-1">{column.label}</div>
      <div className="mt-1 flex flex-col gap-1">
        {series.map((s) => (
          <div key={s.key} className="flex items-baseline gap-2">
            <span
              aria-hidden
              className="h-[2px] w-3 shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            <span className="tnum text-[12px] font-semibold text-ink-1">
              {formatValue(column.values[s.key] ?? 0)}
            </span>
            <span className="text-[11px] text-ink-3">
              {s.label}
              {unitLabel ? ` ${unitLabel}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartLegendNote({ children }: { children: ReactNode }) {
  return <span className="text-[11px] text-ink-4">{children}</span>
}
