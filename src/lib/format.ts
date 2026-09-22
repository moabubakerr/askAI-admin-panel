/** Nulls are normal in this data. Everything here renders an em dash instead. */
export const DASH = '—'

const groupFormat = new Intl.NumberFormat('en')

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH
  return groupFormat.format(value)
}

/** Measured values: keep up to two decimals, drop trailing zeros. */
export function formatValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH
  if (Math.abs(value) >= 1000) return groupFormat.format(Math.round(value))
  return new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value)
}

export function formatDecimal(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH
  return value.toFixed(digits)
}

export function formatPercent(
  value: number | null | undefined,
  digits = 1,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH
  return `${value.toFixed(digits)}%`
}

export function formatLatency(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return DASH
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`
}

export function formatRating(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH
  return value.toFixed(2)
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return DASH
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`
}

export function orDash(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : DASH
}

/* ---- timestamps ---- */

const relativeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600_000],
  ['month', 30 * 24 * 3600_000],
  ['week', 7 * 24 * 3600_000],
  ['day', 24 * 3600_000],
  ['hour', 3600_000],
  ['minute', 60_000],
  ['second', 1000],
]

/** A naive ISO string with no zone is stored as UTC by this backend. */
export function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null
  const normalised = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`
  const date = new Date(normalised)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatRelative(
  value: string | null | undefined,
  now = Date.now(),
): string {
  const date = parseTimestamp(value)
  if (!date) return DASH
  const diff = date.getTime() - now
  const abs = Math.abs(diff)
  if (abs < 45_000) return 'just now'
  for (const [unit, ms] of UNITS) {
    if (abs >= ms) return relativeFormat.format(Math.round(diff / ms), unit)
  }
  return 'just now'
}

const absoluteFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'medium',
})

export function formatAbsolute(value: string | null | undefined): string {
  const date = parseTimestamp(value)
  return date ? absoluteFormat.format(date) : DASH
}

const dayFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' })

export function formatDay(value: string | null | undefined): string {
  const date = parseTimestamp(value)
  return date ? dayFormat.format(date) : DASH
}

/* ---- staleness ---- */

export type Freshness = 'current' | 'ageing' | 'stale' | 'unknown'

/** Period labels arrive as "Aug 2026", "Q3 2024" or "2022". */
export function periodYear(label: string | null | undefined): number | null {
  if (!label) return null
  const match = /(\d{4})/.exec(label)
  return match ? Number(match[1]) : null
}

export function freshnessOf(
  lastPeriod: string | null | undefined,
  today = new Date(),
): { band: Freshness; years: number | null } {
  const year = periodYear(lastPeriod)
  if (year === null) return { band: 'unknown', years: null }
  const years = today.getUTCFullYear() - year
  if (years >= 3) return { band: 'stale', years }
  if (years >= 2) return { band: 'ageing', years }
  return { band: 'current', years }
}

export function freshnessLabel(band: Freshness, years: number | null): string {
  if (band === 'unknown') return 'No period'
  if (band === 'current') return years && years > 0 ? `${years}y behind` : 'Current'
  if (band === 'ageing') return `Ageing · ${years}y`
  return `Stale · ${years}y`
}

/** Truncate a digest for display. The full value stays available to copy. */
export function shortDigest(digest: string | null | undefined, length = 12): string {
  if (!digest) return DASH
  return digest.slice(0, length)
}
