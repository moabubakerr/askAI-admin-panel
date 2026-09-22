import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useApp, useQueryScope } from '../../app/AppContext'
import { ANSWER_SHAPES, type MessageFilters, type MessageRow } from '../../api/types'
import { DataTable, KeyboardHint, type Column, type RowTone } from '../../components/DataTable'
import { Button, Segmented, Select, TextInput } from '../../components/controls'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState, LoadingState } from '../../components/ErrorState'
import { Panel } from '../../components/KpiCard'
import { RtlText } from '../../components/RtlText'
import { Mono, StatusPill } from '../../components/StatusPill'
import { DASH, formatAbsolute, formatLatency, formatRelative } from '../../lib/format'

type Tab = 'all' | 'unverified' | 'feedback'

const PAGE_LIMIT = 50
/** The server caps limit at 500; the refined views work within one such page. */
const REFINED_LIMIT = 500

interface FilterState {
  q: string
  language: '' | 'en' | 'ar'
  answered: '' | 'true' | 'false'
  shape: string
  from: string
  to: string
}

const EMPTY_FILTERS: FilterState = {
  q: '',
  language: '',
  answered: '',
  shape: '',
  from: '',
  to: '',
}

function toIso(local: string): string | undefined {
  if (!local) return undefined
  const date = new Date(local)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

export default function Conversations() {
  const { transport } = useApp()
  const scope = useQueryScope()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('all')
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [offset, setOffset] = useState(0)

  const refined = tab !== 'all'

  const request = useMemo<MessageFilters>(
    () => ({
      q: filters.q || undefined,
      language: filters.language || undefined,
      answered:
        filters.answered === '' ? undefined : filters.answered === 'true',
      shape: filters.shape || undefined,
      from: toIso(filters.from),
      to: toIso(filters.to),
      limit: refined ? REFINED_LIMIT : PAGE_LIMIT,
      offset: refined ? 0 : offset,
    }),
    [filters, offset, refined],
  )

  const query = useQuery({
    queryKey: [...scope, 'messages', request],
    queryFn: () => transport.messages(request),
  })

  function update<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setOffset(0)
  }

  const page = query.data
  const rows = page?.rows ?? []
  const unverified = rows.filter((row) => row.verified === false)
  const feedback = rows.filter((row) => row.rating !== null && row.comment !== null)
  const visible = tab === 'unverified' ? unverified : tab === 'feedback' ? feedback : rows
  const truncated = page ? page.total > page.rows.length : false

  const dirty = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex flex-col gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented<Tab>
              label="Conversation view"
              value={tab}
              onChange={(next) => {
                setTab(next)
                setOffset(0)
              }}
              options={[
                { value: 'all', label: 'All messages' },
                { value: 'unverified', label: 'Unverified', count: unverified.length },
                { value: 'feedback', label: 'Feedback', count: feedback.length },
              ]}
            />
            {dirty && (
              <Button onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</Button>
            )}
            <span className="ml-auto">
              <KeyboardHint />
            </span>
          </div>

          <div className="flex flex-wrap items-end gap-2.5">
            <TextInput
              label="Search question or answer"
              value={filters.q}
              onChange={(event) => update('q', event.target.value)}
              placeholder="substring match"
              className="w-[236px]"
            />
            <Select
              label="Language"
              value={filters.language}
              onChange={(event) => update('language', event.target.value as '' | 'en' | 'ar')}
              className="w-[108px]"
            >
              <option value="">Any</option>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </Select>
            <Select
              label="Answered"
              value={filters.answered}
              onChange={(event) =>
                update('answered', event.target.value as '' | 'true' | 'false')
              }
              className="w-[112px]"
            >
              <option value="">Any</option>
              <option value="true">Answered</option>
              <option value="false">Not answered</option>
            </Select>
            <Select
              label="Answer shape"
              value={filters.shape}
              onChange={(event) => update('shape', event.target.value)}
              className="w-[168px]"
            >
              <option value="">Any</option>
              {ANSWER_SHAPES.map((shape) => (
                <option key={shape} value={shape}>
                  {shape}
                </option>
              ))}
            </Select>
            <TextInput
              label="From"
              type="datetime-local"
              value={filters.from}
              onChange={(event) => update('from', event.target.value)}
              className="w-[186px]"
              hint="inclusive"
            />
            <TextInput
              label="To"
              type="datetime-local"
              value={filters.to}
              onChange={(event) => update('to', event.target.value)}
              className="w-[186px]"
              hint="exclusive"
            />
          </div>

          {refined && truncated && (
            <p className="text-[11px] leading-relaxed text-ink-3">
              The API has no filter for the verification flag or for ratings, so this view
              refines the most recent {REFINED_LIMIT} matching messages — the server's cap.
              Narrow the date range or search to be sure you are seeing everything.
            </p>
          )}
        </div>
      </Panel>

      <Panel>
        {query.isPending ? (
          <LoadingState label="messages" />
        ) : query.isError ? (
          <ErrorState
            what="the messages"
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : tab === 'feedback' ? (
          <FeedbackCards rows={visible} onOpen={(row) => navigate(`/conversations/${row.message_id}`)} />
        ) : (
          <MessagesTable
            rows={visible}
            paging={
              refined
                ? undefined
                : {
                    total: page?.total ?? 0,
                    limit: page?.limit ?? PAGE_LIMIT,
                    offset: page?.offset ?? 0,
                    onOffsetChange: setOffset,
                  }
            }
            dirty={dirty}
            tab={tab}
            onOpen={(row) => navigate(`/conversations/${row.message_id}`)}
          />
        )}
      </Panel>
    </div>
  )
}

function languageTone(language: string | null): 'neutral' | 'info' {
  return language === 'ar' ? 'info' : 'neutral'
}

function MessagesTable({
  rows,
  paging,
  dirty,
  tab,
  onOpen,
}: {
  rows: MessageRow[]
  paging?: { total: number; limit: number; offset: number; onOffsetChange: (n: number) => void }
  dirty: boolean
  tab: Tab
  onOpen: (row: MessageRow) => void
}) {
  const columns: Column<MessageRow>[] = [
    {
      key: 'asked_at',
      header: 'Asked at',
      width: 'w-[136px]',
      render: (row) => (
        <div>
          <div title={formatAbsolute(row.asked_at)} className="whitespace-nowrap text-ink-1">
            {formatRelative(row.asked_at)}
          </div>
          <Mono className="text-ink-4" title={`Session ${row.session_id}`}>
            {row.session_id.slice(0, 8)}
          </Mono>
        </div>
      ),
    },
    {
      key: 'language',
      header: 'Lang',
      width: 'w-[52px]',
      render: (row) => (
        <StatusPill tone={languageTone(row.language)} mono>
          {row.language ?? DASH}
        </StatusPill>
      ),
    },
    {
      key: 'question',
      header: 'Question',
      render: (row) => (
        <RtlText language={row.language} className="line-clamp-2 block text-ink-1">
          {row.question}
        </RtlText>
      ),
    },
    {
      key: 'answer',
      header: 'Answer',
      render: (row) => (
        <RtlText language={row.language} className="line-clamp-2 block text-ink-3">
          {row.answer}
        </RtlText>
      ),
    },
    {
      key: 'shape',
      header: 'Shape',
      width: 'w-[126px]',
      render: (row) => (
        <div>
          <Mono className="text-ink-2">{row.answer_shape ?? DASH}</Mono>
          {row.indicator && (
            <div className="mt-0.5 truncate text-[10.5px] text-ink-4" title={row.indicator}>
              {row.indicator}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'latency',
      header: 'Latency',
      align: 'right',
      width: 'w-[72px]',
      render: (row) => <span className="text-ink-2">{formatLatency(row.latency_ms)}</span>,
    },
    {
      key: 'rating',
      header: 'Rating',
      align: 'right',
      width: 'w-[62px]',
      render: (row) =>
        row.rating === null ? (
          <span className="text-ink-4">{DASH}</span>
        ) : (
          <span className={row.rating <= 2 ? 'font-semibold text-bad' : 'text-ink-2'}>
            {row.rating}
          </span>
        ),
    },
    {
      key: 'flags',
      header: 'Flags',
      width: 'w-[124px]',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.verified === false && (
            <StatusPill
              tone="bad"
              title="An automatic numeric check rejected the wording of this answer. This is the highest-priority flag on this screen."
            >
              Unverified
            </StatusPill>
          )}
          {!row.answered && (
            <StatusPill tone="warn" title="The assistant did not answer this question.">
              No answer
            </StatusPill>
          )}
          {row.comment !== null && <StatusPill tone="gold">Comment</StatusPill>}
        </div>
      ),
    },
  ]

  function tone(row: MessageRow): RowTone {
    if (row.verified === false) return 'bad'
    if (!row.answered) return 'warn'
    return 'default'
  }

  return (
    <DataTable
      caption="Logged messages"
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.message_id}
      rowTone={tone}
      onOpen={onOpen}
      paging={paging}
      empty={
        tab === 'unverified' ? (
          <EmptyState
            title="No unverified answers in this page"
            body="Every answer here passed the automatic numeric check. That is the outcome you want."
          />
        ) : dirty ? (
          <EmptyState
            title="No messages match these filters"
            body="There are messages logged, but none in this date range, language, shape or search. Clear the filters to widen the view."
          />
        ) : (
          <EmptyState
            title="No messages have been logged"
            body="Nothing has been asked of the assistant on this deployment yet."
          />
        )
      }
    />
  )
}

/** One card per rated message with a comment — the comment is the point. */
function FeedbackCards({
  rows,
  onOpen,
}: {
  rows: MessageRow[]
  onOpen: (row: MessageRow) => void
}) {
  if (!rows.length) {
    return (
      <EmptyState
        title="No written feedback in this page"
        body="Ratings with a comment appear here. Most messages are never rated, and most ratings carry no comment."
      />
    )
  }

  return (
    <ul className="divide-y divide-line">
      {rows.map((row) => (
        <li key={row.message_id}>
          <button
            type="button"
            onClick={() => onOpen(row)}
            className="block w-full px-4 py-3.5 text-left hover:bg-maroon-tint"
          >
            <div className="flex items-start gap-3">
              <span
                className={`tnum grid size-7 shrink-0 place-items-center rounded-[7px] text-[13px] font-semibold ${
                  row.rating !== null && row.rating <= 2
                    ? 'bg-bad-bg text-bad'
                    : 'bg-ok-bg text-ok'
                }`}
                title={`Rated ${row.rating} out of 5`}
              >
                {row.rating}
              </span>

              <div className="min-w-0 flex-1">
                <RtlText
                  language={row.language}
                  as="p"
                  className="block text-[12.5px] font-medium text-ink-1"
                >
                  {row.question}
                </RtlText>

                <div className="mt-2 border-l-[3px] border-gold bg-gold-tint/60 px-3 py-2">
                  <RtlText
                    language={row.language}
                    as="p"
                    className="block text-[12.5px] leading-relaxed text-ink-1"
                  >
                    {row.comment}
                  </RtlText>
                </div>

                <RtlText
                  language={row.language}
                  as="p"
                  className="mt-2 line-clamp-2 block text-[11.5px] leading-relaxed text-ink-3"
                >
                  {row.answer}
                </RtlText>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-ink-4">
                  <span title={formatAbsolute(row.asked_at)}>
                    {formatRelative(row.asked_at)}
                  </span>
                  <Mono>{row.answer_shape ?? DASH}</Mono>
                  <Mono title={`Message ${row.message_id}`}>
                    {row.message_id.slice(0, 8)}
                  </Mono>
                  {row.verified === false && <StatusPill tone="bad">Unverified</StatusPill>}
                  {!row.answered && <StatusPill tone="warn">No answer</StatusPill>}
                </div>
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
