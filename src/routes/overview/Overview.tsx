import { useQuery } from '@tanstack/react-query'
import { useApp, useQueryScope } from '../../app/AppContext'
import { COPY } from '../../copy'
import type {
  AnswerShapeStatsRow,
  DailyCountRow,
  LanguageStatsRow,
  Stats,
} from '../../api/types'
import {
  ColumnChart,
  HBar,
  SERIES_ANSWERED,
  SERIES_REFUSALS,
} from '../../components/BarSeries'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState, LoadingState } from '../../components/ErrorState'
import { KpiCard, Panel } from '../../components/KpiCard'
import { RtlText } from '../../components/RtlText'
import { Eyebrow, Mono, StatusPill } from '../../components/StatusPill'
import {
  DASH,
  formatCount,
  formatDay,
  formatLatency,
  formatPercent,
  formatRating,
  formatRelative,
  formatAbsolute,
} from '../../lib/format'

export default function Overview() {
  const { transport } = useApp()
  const scope = useQueryScope()

  const stats = useQuery({
    queryKey: [...scope, 'stats'],
    queryFn: () => transport.stats(),
  })

  if (stats.isPending) return <LoadingState label="statistics" />
  if (stats.isError) {
    return (
      <ErrorState
        what="the statistics"
        error={stats.error}
        onRetry={() => void stats.refetch()}
      />
    )
  }

  return <OverviewBody stats={stats.data} />
}

function OverviewBody({ stats }: { stats: Stats }) {
  const { overall, ratings } = stats
  const hasMessages = overall.messages > 0
  const hasRatings = ratings.ratings > 0

  return (
    <div className="flex flex-col gap-4">
      {!hasMessages && (
        <div className="rounded-[10px] border border-line bg-surface px-4 py-3.5">
          <p className="text-[13px] font-semibold text-ink-1">
            Nothing has been asked yet
          </p>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-ink-3">
            This deployment has no logged messages, so there is no refusal rate, no
            rating and no latency to report. Every panel below will fill in once the
            assistant answers its first question.
          </p>
        </div>
      )}

      {/* Equal height, with each card's body free to fill, so the shorter
          panel does not leave a void beside the taller one. */}
      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          label="Refusal rate"
          stripe="maroon"
          value={hasMessages ? formatPercent(overall.refusal_rate_pct) : DASH}
          note={
            hasMessages ? (
              <>
                {formatCount(overall.refusals)} of {formatCount(overall.messages)}{' '}
                messages were not answered
              </>
            ) : (
              'No messages logged yet'
            )
          }
        >
          <LanguageSplit rows={stats.by_language} />
        </KpiCard>

        <KpiCard
          label="Average rating"
          stripe="gold"
          value={hasRatings ? formatRating(ratings.avg_rating) : DASH}
          unit={hasRatings ? 'out of 5' : undefined}
          note={
            hasRatings ? (
              <>
                {formatCount(ratings.ratings)} ratings ·{' '}
                {formatCount(ratings.low_ratings)} at 2 or below ·{' '}
                {formatCount(ratings.with_comment)} with a comment
              </>
            ) : (
              'No answer has been rated yet'
            )
          }
        >
          <RatingDistribution stats={stats} />
        </KpiCard>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Messages" value={formatCount(overall.messages)} />
        <KpiCard
          label="Average latency"
          value={hasMessages ? formatLatency(overall.avg_latency_ms) : DASH}
        />
        <KpiCard
          label="Last message"
          value={overall.last_message_at ? formatRelative(overall.last_message_at) : DASH}
          note={
            overall.last_message_at ? formatAbsolute(overall.last_message_at) : undefined
          }
        />
      </div>

      <ByAnswerShape rows={stats.by_answer_shape} />

      <div className="grid grid-cols-3 gap-4">
        <DailyChart stats={stats} className="col-span-2" />
        <TopIndicators rows={stats.top_indicators} />
      </div>
    </div>
  )
}

/* ---- language comparison: never averaged together ---- */

function LanguageSplit({ rows }: { rows: LanguageStatsRow[] }) {
  const english = rows.find((row) => row.language === 'en')
  const arabic = rows.find((row) => row.language === 'ar')
  const maxMessages = Math.max(english?.messages ?? 0, arabic?.messages ?? 0, 1)
  const maxLatency = Math.max(english?.avg_latency_ms ?? 0, arabic?.avg_latency_ms ?? 0, 1)

  if (!rows.length) {
    return (
      <p className="border-t border-line pt-2.5 text-[11px] text-ink-3">
        No language breakdown yet. {COPY.arabicGapNote}
      </p>
    )
  }

  const gap =
    english?.refusal_rate_pct !== null &&
    english?.refusal_rate_pct !== undefined &&
    arabic?.refusal_rate_pct !== null &&
    arabic?.refusal_rate_pct !== undefined
      ? arabic.refusal_rate_pct - english.refusal_rate_pct
      : null

  return (
    <div className="border-t border-line pt-3">
      <Eyebrow>Refusal rate by language</Eyebrow>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <LanguageColumn
          title="English"
          row={english}
          maxMessages={maxMessages}
          maxLatency={maxLatency}
        />
        <LanguageColumn
          title="Arabic"
          row={arabic}
          maxMessages={maxMessages}
          maxLatency={maxLatency}
          note={COPY.arabicGapNote}
        />
      </div>
      <p className="mt-2.5 border-t border-line pt-2.5 text-[11.5px] leading-relaxed text-ink-2">
        {gap === null ? (
          'There is not enough data in both languages to state a gap yet.'
        ) : Math.abs(gap) < 0.05 ? (
          'Arabic and English are refusing at effectively the same rate.'
        ) : (
          <>
            Arabic refuses{' '}
            <strong className="font-semibold">
              {formatPercent(Math.abs(gap))} {gap > 0 ? 'more' : 'less'}
            </strong>{' '}
            often than English
            {gap > 0 ? ' — the gap is against Arabic.' : ' — the gap is against English.'}
          </>
        )}
      </p>
    </div>
  )
}

function LanguageColumn({
  title,
  row,
  maxMessages,
  maxLatency,
  note,
}: {
  title: string
  row: LanguageStatsRow | undefined
  maxMessages: number
  maxLatency: number
  note?: string
}) {
  return (
    <div className="rounded-[8px] border border-line bg-sunken p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-ink-1">{title}</span>
        <Mono className="text-ink-4">{title === 'English' ? 'en' : 'ar'}</Mono>
      </div>

      {!row || row.messages === 0 ? (
        <p className="mt-1.5 text-[11px] text-ink-4">No messages in {title}.</p>
      ) : (
        <>
          <div className="mt-1.5 text-[20px] font-semibold leading-6 text-ink-1">
            {formatPercent(row.refusal_rate_pct)}
          </div>
          <div className="mt-2 flex flex-col gap-1.5 text-[11px] text-ink-3">
            <span className="flex items-center justify-between gap-2">
              <span>Messages</span>
              <span className="flex items-center gap-1.5">
                <HBar value={row.messages} max={maxMessages} tone="steel" width="w-14" />
                <span className="tnum w-8 text-right text-ink-2">
                  {formatCount(row.messages)}
                </span>
              </span>
            </span>
            <span className="flex items-center justify-between gap-2">
              <span>Avg latency</span>
              <span className="flex items-center gap-1.5">
                <HBar
                  value={row.avg_latency_ms}
                  max={maxLatency}
                  tone="neutral"
                  width="w-14"
                />
                <span className="tnum w-12 text-right text-ink-2">
                  {formatLatency(row.avg_latency_ms)}
                </span>
              </span>
            </span>
            <span className="flex items-center justify-between gap-2">
              <span>Refused</span>
              <span className="tnum text-ink-2">{formatCount(row.refusals)}</span>
            </span>
          </div>
        </>
      )}

      {note && (
        <p className="mt-2 border-t border-line pt-2 text-[10.5px] leading-relaxed text-ink-4">
          {note}
        </p>
      )}
    </div>
  )
}

/* ---- rating distribution ---- */

function RatingDistribution({ stats }: { stats: Stats }) {
  const total = stats.ratings.ratings
  if (total === 0) {
    return (
      <p className="border-t border-line pt-2.5 text-[11px] text-ink-3">
        No ratings yet, so there is no distribution to show.
      </p>
    )
  }
  const counts = new Map(stats.rating_distribution.map((row) => [row.rating, row.n]))
  const max = Math.max(...[1, 2, 3, 4, 5].map((r) => counts.get(r) ?? 0), 1)

  return (
    <div className="flex flex-1 flex-col border-t border-line pt-3">
      <Eyebrow>Rating distribution</Eyebrow>
      <div className="mt-2 flex flex-1 flex-col justify-between gap-1.5">
        {[5, 4, 3, 2, 1].map((rating) => {
          const n = counts.get(rating) ?? 0
          return (
            <div key={rating} className="flex items-center gap-2 text-[11px]">
              <span className="tnum w-3 text-ink-3">{rating}</span>
              <HBar
                value={n}
                max={max}
                tone={rating <= 2 ? 'maroon' : rating === 3 ? 'gold' : 'ok'}
                width="w-full"
                thick
              />
              <span className="tnum w-8 text-right text-ink-2">{formatCount(n)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---- answer shapes, worst first ---- */

function ByAnswerShape({ rows }: { rows: AnswerShapeStatsRow[] }) {
  const rated = rows
    .filter((row) => row.avg_rating !== null && row.ratings > 0)
    .sort((a, b) => (a.avg_rating ?? 0) - (b.avg_rating ?? 0))
  const unrated = rows
    .filter((row) => row.avg_rating === null || row.ratings === 0)
    .sort((a, b) => b.messages - a.messages)

  return (
    <Panel
      title="Answer shapes by rating, worst first"
      subtitle="Which kind of answer people rate badly. Shapes with no ratings yet are listed below the rated ones rather than sorted as if they scored zero."
    >
      {rows.length === 0 ? (
        <EmptyState
          title="No answers have been produced yet"
          body="Once the assistant answers, each answer shape appears here with its average rating."
        />
      ) : (
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-line bg-sunken text-left">
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-4">
                Answer shape
              </th>
              <th className="w-24 px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-4">
                Avg rating
              </th>
              <th className="w-52 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-4">
                Rating band
              </th>
              <th className="w-20 px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-4">
                Ratings
              </th>
              <th className="w-24 px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-4">
                Messages
              </th>
            </tr>
          </thead>
          <tbody>
            {rated.map((row) => {
              const rating = row.avg_rating ?? 0
              const tone = rating < 3 ? 'bad' : rating < 4 ? 'gold' : 'ok'
              return (
                <tr key={row.answer_shape ?? 'unknown'} className="border-b border-rowline">
                  <td className="px-3 py-2">
                    <Mono className="text-ink-1">{row.answer_shape ?? DASH}</Mono>
                  </td>
                  <td
                    className={`tnum px-3 py-2 text-right font-semibold ${
                      rating < 3 ? 'text-bad' : rating < 4 ? 'text-gold-ink' : 'text-ok'
                    }`}
                  >
                    {formatRating(row.avg_rating)}
                  </td>
                  <td className="px-3 py-2">
                    <HBar value={rating} max={5} tone={tone} width="w-40" />
                  </td>
                  <td className="tnum px-3 py-2 text-right text-ink-2">
                    {formatCount(row.ratings)}
                  </td>
                  <td className="tnum px-3 py-2 text-right text-ink-2">
                    {formatCount(row.messages)}
                  </td>
                </tr>
              )
            })}
            {unrated.map((row) => (
              <tr
                key={row.answer_shape ?? 'unknown'}
                className="border-b border-rowline bg-sunken"
              >
                <td className="px-3 py-2">
                  <Mono className="text-ink-3">{row.answer_shape ?? DASH}</Mono>
                </td>
                <td className="px-3 py-2 text-right text-ink-4">{DASH}</td>
                <td className="px-3 py-2">
                  <StatusPill tone="muted">Not rated yet</StatusPill>
                </td>
                <td className="tnum px-3 py-2 text-right text-ink-4">0</td>
                <td className="tnum px-3 py-2 text-right text-ink-2">
                  {formatCount(row.messages)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  )
}

/* ---- 30-day messages and refusals ---- */

function DailyChart({ stats, className }: { stats: Stats; className?: string }) {
  const { transport } = useApp()
  const scope = useQueryScope()

  // /admin/stats has no daily series, so in live mode it is bucketed from a
  // bounded messages query rather than fetching the whole table.
  const needsDerivation = stats.by_day === undefined
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 29)
  since.setUTCHours(0, 0, 0, 0)

  const derived = useQuery({
    queryKey: [...scope, 'by-day', since.toISOString()],
    queryFn: () => transport.messages({ from: since.toISOString(), limit: 500 }),
    enabled: needsDerivation,
  })

  let days: DailyCountRow[] | null = stats.by_day ?? null
  let capped = false
  if (needsDerivation && derived.data) {
    const buckets = new Map<string, DailyCountRow>()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(since)
      date.setUTCDate(date.getUTCDate() + (29 - i))
      const day = date.toISOString().slice(0, 10)
      buckets.set(day, { day, messages: 0, refusals: 0 })
    }
    for (const row of derived.data.rows) {
      const bucket = buckets.get(row.asked_at.slice(0, 10))
      if (!bucket) continue
      bucket.messages += 1
      if (!row.answered) bucket.refusals += 1
    }
    days = [...buckets.values()]
    capped = derived.data.total > derived.data.rows.length
  }

  return (
    <Panel
      title="Messages and refusals, last 30 days"
      subtitle={
        capped
          ? 'Bucketed from the most recent 500 messages, which is the server cap — earlier days in this window may undercount.'
          : undefined
      }
      className={className}
    >
      {needsDerivation && derived.isPending ? (
        <LoadingState label="the last 30 days" />
      ) : needsDerivation && derived.isError ? (
        <ErrorState
          what="the 30-day message counts"
          error={derived.error}
          onRetry={() => void derived.refetch()}
        />
      ) : !days || days.every((day) => day.messages === 0) ? (
        <EmptyState
          title="No messages in the last 30 days"
          body="The chart draws once there is at least one logged message in this window."
        />
      ) : (
        <div className="px-4 py-3.5">
          <ColumnChart
            caption="Messages answered and refused, by day, over the last 30 days"
            unitLabel="messages"
            columns={days.map((day, index) => ({
              label: formatDay(`${day.day}T00:00:00Z`),
              axisLabel: index % 5 === 0 ? formatDay(`${day.day}T00:00:00Z`) : '',
              values: { messages: day.messages - day.refusals, refusals: day.refusals },
            }))}
            series={[
              { key: 'refusals', label: 'Refused', color: SERIES_REFUSALS },
              { key: 'messages', label: 'Answered', color: SERIES_ANSWERED },
            ]}
            mode="stacked"
            height={158}
          />
        </div>
      )}
    </Panel>
  )
}

/* ---- top indicators ---- */

function TopIndicators({ rows }: { rows: Stats['top_indicators'] }) {
  const max = rows.reduce((acc, row) => Math.max(acc, row.n), 0)
  return (
    <Panel title="Most asked-about indicators">
      {rows.length === 0 ? (
        <EmptyState
          title="No indicator has been asked about yet"
          body="Questions that resolve to a published indicator are counted here."
        />
      ) : (
        <ol className="divide-y divide-rowline">
          {rows.slice(0, 9).map((row, index) => (
            <li
              key={`${row.indicator ?? 'unknown'}-${index}`}
              className="flex items-center gap-2.5 px-3 py-[7px] text-[12px]"
            >
              <span className="tnum w-3 shrink-0 text-[10px] text-ink-4">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate">
                <RtlText className="text-ink-1">{row.indicator}</RtlText>
              </span>
              <HBar value={row.n} max={max} tone="neutral" width="w-12" />
              <span className="tnum w-6 shrink-0 text-right text-ink-2">
                {formatCount(row.n)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
