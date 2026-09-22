import { COPY } from '../../copy'
import { ApiError, type AdminTransport, type CatalogueFilters } from '../transport'
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  type AnswerShapeStatsRow,
  type CatalogueRow,
  type DailyCountRow,
  type LanguageStatsRow,
  type MessageFilters,
  type MessageRow,
  type Paged,
  type RatingDistributionRow,
  type Stats,
  type TopIndicatorRow,
} from '../types'
import { CATALOGUE, findIndicator } from './indicators'
import { LINEAGE } from './lineage'
import { MESSAGES, PROVENANCE } from './messages'

export { ACCOUNTS, ACTIVITY } from './users'
export { GAP_NOTES, groupByTable, type TableGroup } from './lineage'

/** Demo credentials for the login screen hint. Fixtures only — no server. */
export const MOCK_USERNAME = 'admin'
export const MOCK_PASSWORD = 'demo'

const LATENCY_MS = 220

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))
}

function mean(values: number[]): number | null {
  if (!values.length) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function paginate<T>(rows: T[], limit?: number, offset?: number): Paged<T> {
  const effectiveLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
  const effectiveOffset = Math.max(offset ?? 0, 0)
  return {
    total: rows.length,
    limit: effectiveLimit,
    offset: effectiveOffset,
    rows: rows.slice(effectiveOffset, effectiveOffset + effectiveLimit),
  }
}

/* ---- stats, derived from the message fixtures so the numbers agree ---- */

function buildByLanguage(rows: MessageRow[]): LanguageStatsRow[] {
  const languages = ['en', 'ar']
  return languages.map((language) => {
    const subset = rows.filter((row) => row.language === language)
    const refusals = subset.filter((row) => !row.answered).length
    return {
      language,
      messages: subset.length,
      refusals,
      refusal_rate_pct: subset.length ? (refusals / subset.length) * 100 : null,
      avg_latency_ms: mean(
        subset.map((row) => row.latency_ms).filter((v): v is number => v !== null),
      ),
    }
  })
}

function buildByAnswerShape(rows: MessageRow[]): AnswerShapeStatsRow[] {
  const shapes = new Map<string, MessageRow[]>()
  for (const row of rows) {
    const key = row.answer_shape ?? 'other'
    const bucket = shapes.get(key)
    if (bucket) bucket.push(row)
    else shapes.set(key, [row])
  }
  return [...shapes.entries()].map(([answer_shape, subset]) => {
    const ratings = subset
      .map((row) => row.rating)
      .filter((v): v is number => v !== null)
    return {
      answer_shape,
      messages: subset.length,
      ratings: ratings.length,
      avg_rating: mean(ratings),
    }
  })
}

function buildRatingDistribution(rows: MessageRow[]): RatingDistributionRow[] {
  const counts = new Map<number, number>()
  for (const row of rows) {
    if (row.rating === null) continue
    counts.set(row.rating, (counts.get(row.rating) ?? 0) + 1)
  }
  return [1, 2, 3, 4, 5]
    .map((rating) => ({ rating, n: counts.get(rating) ?? 0 }))
    .filter((row) => row.n > 0)
}

function buildTopIndicators(rows: MessageRow[]): TopIndicatorRow[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    if (!row.indicator) continue
    counts.set(row.indicator, (counts.get(row.indicator) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([indicator, n]) => ({ indicator, n }))
    .sort((a, b) => b.n - a.n)
}

/** Thirty days ending today, with the fixture messages counted on their own day. */
function buildByDay(rows: MessageRow[]): DailyCountRow[] {
  const days: DailyCountRow[] = []
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setUTCDate(date.getUTCDate() - i)
    const day = date.toISOString().slice(0, 10)
    const onDay = rows.filter((row) => row.asked_at.slice(0, 10) === day)
    // Background traffic the fixtures do not enumerate, so the chart reads as a
    // real 30-day window rather than eight isolated spikes.
    const baseline = 8 + Math.round(Math.sin(i * 0.7) * 5 + Math.cos(i * 1.9) * 3)
    const messages = Math.max(0, baseline) + onDay.length
    const refusals =
      Math.max(0, Math.round(baseline * 0.14 + Math.sin(i * 2.3))) +
      onDay.filter((row) => !row.answered).length
    days.push({ day, messages, refusals: Math.min(refusals, messages) })
  }
  return days
}

function buildStats(): Stats {
  const rows = MESSAGES
  const refusals = rows.filter((row) => !row.answered).length
  const ratings = rows.map((row) => row.rating).filter((v): v is number => v !== null)
  const sessions = new Set(rows.map((row) => row.session_id)).size
  const latest = rows.reduce<string | null>(
    (acc, row) => (acc === null || row.asked_at > acc ? row.asked_at : acc),
    null,
  )

  return {
    overall: {
      messages: rows.length,
      sessions,
      refusals,
      refusal_rate_pct: rows.length ? (refusals / rows.length) * 100 : null,
      unverified: rows.filter((row) => row.verified === false).length,
      avg_latency_ms: mean(
        rows.map((row) => row.latency_ms).filter((v): v is number => v !== null),
      ),
      last_message_at: latest,
    },
    ratings: {
      ratings: ratings.length,
      avg_rating: mean(ratings),
      low_ratings: ratings.filter((r) => r <= 2).length,
      with_comment: rows.filter((row) => row.comment !== null).length,
    },
    rating_distribution: buildRatingDistribution(rows),
    by_language: buildByLanguage(rows),
    by_answer_shape: buildByAnswerShape(rows),
    top_indicators: buildTopIndicators(rows),
    by_day: buildByDay(rows),
  }
}

/* ---- filtering ---- */

function applyMessageFilters(rows: MessageRow[], filters: MessageFilters): MessageRow[] {
  let out = [...rows].sort((a, b) => b.asked_at.localeCompare(a.asked_at))
  if (filters.from) out = out.filter((row) => row.asked_at >= filters.from!)
  if (filters.to) out = out.filter((row) => row.asked_at < filters.to!)
  if (filters.language) out = out.filter((row) => row.language === filters.language)
  if (filters.answered !== undefined) {
    out = out.filter((row) => row.answered === filters.answered)
  }
  if (filters.shape) out = out.filter((row) => row.answer_shape === filters.shape)
  if (filters.q) {
    const needle = filters.q.toLowerCase()
    out = out.filter(
      (row) =>
        (row.question ?? '').toLowerCase().includes(needle) ||
        (row.answer ?? '').toLowerCase().includes(needle),
    )
  }
  return out
}

function toCatalogueRow(detail: (typeof CATALOGUE)[number]): CatalogueRow {
  const { series: _series, provenance: _provenance, is_main: _isMain, ...row } = detail
  return row
}

/* ---- transport ---- */

export function createMockTransport(): AdminTransport {
  return {
    login: (username, password) => {
      if (username !== MOCK_USERNAME || password !== MOCK_PASSWORD) {
        return Promise.reject(
          new ApiError('http', 401, 'Incorrect username or password.'),
        )
      }
      return delay({
        ok: true,
        token: 'mock-session-token',
        expires_at: Math.floor(Date.now() / 1000) + 8 * 3600,
        username,
      })
    },
    me: () =>
      delay({
        via: 'mock',
        username: MOCK_USERNAME,
        expires_at: Math.floor(Date.now() / 1000) + 8 * 3600,
      }),
    logout: () => delay({ ok: true, ended: true }),
    stats: () => delay(buildStats()),
    messages: (filters) => {
      const filtered = applyMessageFilters(MESSAGES, filters)
      return delay(paginate(filtered, filters.limit, filters.offset))
    },
    provenance: (messageId) => {
      const found = PROVENANCE.get(messageId)
      if (!found) {
        return Promise.reject(
          new ApiError('not-found', 404, COPY.provenanceNotFoundTitle),
        )
      }
      return delay(found)
    },
    catalogue: (filters: CatalogueFilters) => {
      let rows = CATALOGUE.map(toCatalogueRow)
      if (filters.q) {
        const needle = filters.q.toLowerCase()
        rows = rows.filter(
          (row) =>
            (row.name_en ?? '').toLowerCase().includes(needle) ||
            (row.name_ar ?? '').includes(filters.q!) ||
            (row.detail_name_en ?? '').toLowerCase().includes(needle) ||
            (row.data_source_en ?? '').toLowerCase().includes(needle),
        )
      }
      return delay(paginate(rows, filters.limit, filters.offset))
    },
    catalogueDetail: (id) => {
      const found = findIndicator(id)
      if (!found) {
        return Promise.reject(
          new ApiError('not-found', 404, 'No published indicator with that id.'),
        )
      }
      return delay(found)
    },
    lineage: () => delay(LINEAGE),
  }
}
