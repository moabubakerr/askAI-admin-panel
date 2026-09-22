import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useApp, useQueryScope } from '../../app/AppContext'
import { COPY } from '../../copy'
import { DataTable, KeyboardHint, type Column, type RowTone } from '../../components/DataTable'
import { TextInput, Toggle } from '../../components/controls'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState, LoadingState } from '../../components/ErrorState'
import { Panel } from '../../components/KpiCard'
import { RtlText } from '../../components/RtlText'
import { StatusPill, type PillTone } from '../../components/StatusPill'
import {
  formatCount,
  freshnessLabel,
  freshnessOf,
  orDash,
  type Freshness,
} from '../../lib/format'

const PAGE_LIMIT = 50
/** The server caps limit at 500, which covers the whole loaded catalogue. */
const WIDE_LIMIT = 500

const FRESHNESS_TONE: Record<Freshness, PillTone> = {
  current: 'ok',
  ageing: 'warn',
  stale: 'bad',
  unknown: 'muted',
}

export default function Catalogue() {
  const { transport } = useApp()
  const scope = useQueryScope()
  const navigate = useNavigate()

  const [q, setQ] = useState('')
  const [staleOnly, setStaleOnly] = useState(false)
  const [offset, setOffset] = useState(0)

  const request = useMemo(
    () => ({
      q: q || undefined,
      limit: staleOnly ? WIDE_LIMIT : PAGE_LIMIT,
      offset: staleOnly ? 0 : offset,
    }),
    [q, staleOnly, offset],
  )

  const query = useQuery({
    queryKey: [...scope, 'catalogue', request],
    queryFn: () => transport.catalogue(request),
  })

  const page = query.data
  const withFreshness = useMemo(
    () =>
      (page?.rows ?? []).map((row) => ({ row, ...freshnessOf(row.last_period) })),
    [page],
  )
  // Stalest first. The API has no sort parameter, so this orders the page the
  // server returned.
  const sorted = useMemo(
    () => [...withFreshness].sort((a, b) => (b.years ?? -1) - (a.years ?? -1)),
    [withFreshness],
  )
  const behind = sorted.filter((entry) => entry.band === 'ageing' || entry.band === 'stale')
  const visible = staleOnly ? behind : sorted
  const truncated = page ? page.total > page.rows.length : false

  const columns: Column<(typeof visible)[number]>[] = [
    {
      key: 'indicator',
      header: 'Indicator',
      render: ({ row }) => (
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-medium text-ink-1">
            {orDash(row.name_en)}
          </div>
          {row.detail_name_en && (
            <div className="truncate text-[11px] text-ink-4">{row.detail_name_en}</div>
          )}
        </div>
      ),
    },
    {
      key: 'name_ar',
      header: 'Arabic name',
      width: 'w-[210px]',
      render: ({ row }) => (
        <RtlText className="line-clamp-2 block text-[12px] text-ink-2">
          {row.name_ar}
        </RtlText>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: 'w-[130px]',
      render: ({ row }) => (
        <span className="text-[11.5px] text-ink-3">{orDash(row.indicator_type_en)}</span>
      ),
    },
    {
      key: 'unit',
      header: 'Unit',
      width: 'w-[140px]',
      render: ({ row }) => (
        <span className="text-[11.5px] text-ink-2">{orDash(row.unit_en)}</span>
      ),
    },
    {
      key: 'data_points',
      header: 'Data points',
      align: 'right',
      width: 'w-[86px]',
      render: ({ row }) => (
        <span className="font-semibold text-ink-1">{formatCount(row.data_points)}</span>
      ),
    },
    {
      key: 'first_period',
      header: 'First period',
      align: 'right',
      width: 'w-[92px]',
      render: ({ row }) => <span className="text-ink-3">{orDash(row.first_period)}</span>,
    },
    {
      key: 'last_period',
      header: 'Last period',
      align: 'right',
      width: 'w-[92px]',
      render: ({ row }) => (
        <span className="font-semibold text-ink-1">{orDash(row.last_period)}</span>
      ),
    },
    {
      key: 'freshness',
      header: 'Freshness',
      width: 'w-[108px]',
      render: ({ band, years }) => (
        <StatusPill
          tone={FRESHNESS_TONE[band]}
          title={
            band === 'current'
              ? 'The latest loaded period is within the last two years.'
              : band === 'unknown'
                ? 'No last period is recorded for this indicator.'
                : `The latest loaded period is ${years} years old, so questions about anything newer will be refused.`
          }
        >
          {freshnessLabel(band, years)}
        </StatusPill>
      ),
    },
  ]

  function tone({ band }: (typeof visible)[number]): RowTone {
    if (band === 'stale') return 'bad'
    if (band === 'ageing') return 'warn'
    return 'default'
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex flex-col gap-2.5 px-4 py-3">
          <div className="flex flex-wrap items-end gap-4">
            <TextInput
              label="Search indicators"
              value={q}
              onChange={(event) => {
                setQ(event.target.value)
                setOffset(0)
              }}
              placeholder="name, detail or data source"
              className="w-[280px]"
            />
            <div className="pb-1">
              <Toggle
                checked={staleOnly}
                onChange={(next) => {
                  setStaleOnly(next)
                  setOffset(0)
                }}
                label="Stale only"
                hint={`${formatCount(behind.length)} two or more years behind`}
              />
            </div>
            <span className="ml-auto pb-1">
              <KeyboardHint />
            </span>
          </div>

          <p className="max-w-4xl text-[11px] leading-relaxed text-ink-3">
            {COPY.staleExplainer} The filter covers both bands — ageing at two years and
            stale at three or more. Rows are ordered stalest first; the API has no sort
            parameter, so that ordering applies to the page the server returned.
          </p>

          {staleOnly && truncated && (
            <p className="text-[11px] leading-relaxed text-ink-3">
              Filtered within the most recent {WIDE_LIMIT} indicators, the server's cap.
            </p>
          )}
        </div>
      </Panel>

      <Panel>
        {query.isPending ? (
          <LoadingState label="the indicator catalogue" />
        ) : query.isError ? (
          <ErrorState
            what="the indicator catalogue"
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <DataTable
            caption="Published indicators"
            rows={visible}
            columns={columns}
            getRowKey={({ row }) => row.indicator_id}
            rowTone={tone}
            onOpen={({ row }) =>
              navigate(
                `/catalogue/${row.published_detail_id ?? row.indicator_detail_id ?? row.indicator_id}`,
              )
            }
            paging={
              staleOnly
                ? undefined
                : {
                    total: page?.total ?? 0,
                    limit: page?.limit ?? PAGE_LIMIT,
                    offset: page?.offset ?? 0,
                    onOffsetChange: setOffset,
                  }
            }
            empty={
              staleOnly ? (
                <EmptyState
                  title="Nothing is two or more years behind"
                  body="Every loaded indicator has data within the last two years. That is the outcome you want."
                />
              ) : q ? (
                <EmptyState
                  title="No indicator matches that search"
                  body="The search covers the English name, the detail name and the data source."
                />
              ) : (
                <EmptyState
                  title="No indicators are loaded"
                  body="The catalogue is empty, so the assistant has nothing to answer from. Check the data lineage screen for the last ETL load."
                />
              )
            }
          />
        )}
      </Panel>
    </div>
  )
}

