import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useApp, useQueryScope } from '../../app/AppContext'
import { ApiError } from '../../api/transport'
import type { CatalogueDetail } from '../../api/types'
import { COPY } from '../../copy'
import { ColumnChart } from '../../components/BarSeries'
import { Chip } from '../../components/controls'
import { CopyDigest } from '../../components/CopyDigest'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState, LoadingState } from '../../components/ErrorState'
import { Panel } from '../../components/KpiCard'
import { RtlText } from '../../components/RtlText'
import { Eyebrow, Mono, StatusPill, type PillTone } from '../../components/StatusPill'
import {
  DASH,
  formatAbsolute,
  formatCount,
  formatRelative,
  formatValue,
  freshnessLabel,
  freshnessOf,
  orDash,
  type Freshness,
} from '../../lib/format'

const FRESHNESS_TONE: Record<Freshness, PillTone> = {
  current: 'ok',
  ageing: 'warn',
  stale: 'bad',
  unknown: 'muted',
}

export default function IndicatorDetail() {
  const { indicatorId = '' } = useParams()
  const { transport } = useApp()
  const scope = useQueryScope()
  const navigate = useNavigate()

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') navigate('/catalogue')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [navigate])

  const query = useQuery({
    queryKey: [...scope, 'catalogue-detail', indicatorId],
    queryFn: () => transport.catalogueDetail(indicatorId),
    retry: false,
  })

  const notFound =
    query.isError && query.error instanceof ApiError && query.error.kind === 'not-found'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link to="/catalogue" className="text-[12px] font-medium text-maroon hover:underline">
          ← Back to catalogue
        </Link>
        <Mono className="text-ink-4" title={indicatorId}>
          {indicatorId}
        </Mono>
      </div>

      {query.isPending ? (
        <Panel>
          <LoadingState label="the indicator" />
        </Panel>
      ) : notFound ? (
        <Panel>
          <EmptyState
            title="No published indicator with that id"
            body="The id may belong to a working row that was never published, or to a record removed by a later ETL load."
          />
        </Panel>
      ) : query.isError ? (
        <ErrorState
          what="the indicator"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <Detail detail={query.data} />
      )}
    </div>
  )
}

function Detail({ detail }: { detail: CatalogueDetail }) {
  const { band, years } = freshnessOf(detail.last_period)
  const series = detail.series
  const hasTarget = series.some((point) => point.target !== null)

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="px-4 py-3.5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold leading-snug text-ink-1">
                {orDash(detail.name_en)}
              </h2>
              {detail.detail_name_en && (
                <p className="text-[12px] text-ink-3">{detail.detail_name_en}</p>
              )}
              <RtlText as="p" className="mt-1 block text-[13px] text-ink-2">
                {detail.name_ar}
              </RtlText>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <StatusPill tone={FRESHNESS_TONE[band]}>
                {freshnessLabel(band, years)}
              </StatusPill>
              {detail.is_main && (
                <StatusPill tone="gold" title={COPY.isMainCaveat}>
                  Headline row
                </StatusPill>
              )}
            </div>
          </div>

          {/* Two different GUIDs for the same thing. Showing only one hides a
              whole class of bug, so both are labelled explicitly. */}
          <div className="mt-3.5 grid grid-cols-2 gap-3 rounded-[8px] border border-line bg-sunken p-3">
            <div>
              <Eyebrow>Source id</Eyebrow>
              <Mono className="mt-1 block break-all text-ink-1">
                {orDash(detail.indicator_detail_id)}
              </Mono>
              <p className="mt-1 text-[10.5px] text-ink-4">
                indicator_detail_id — the row in the working source data.
              </p>
            </div>
            <div>
              <Eyebrow>Published id</Eyebrow>
              <Mono className="mt-1 block break-all text-ink-1">
                {orDash(detail.published_detail_id)}
              </Mono>
              <p className="mt-1 text-[10.5px] text-ink-4">
                published_detail_id — the row cleared for publication.
              </p>
            </div>
            <div className="col-span-2 border-t border-line pt-2.5">
              <Eyebrow>Indicator id</Eyebrow>
              <Mono className="mt-1 block break-all text-ink-2">
                {orDash(detail.indicator_id)}
              </Mono>
            </div>
          </div>

          {detail.is_main && (
            <p className="mt-2.5 text-[11px] leading-relaxed text-ink-3">
              <span className="font-medium text-ink-2">Headline row.</span>{' '}
              {COPY.isMainCaveat}
            </p>
          )}

          <div className="mt-3.5 flex flex-wrap gap-1.5">
            <Chip label="Type">{orDash(detail.indicator_type_en)}</Chip>
            <Chip label="Unit EN">{orDash(detail.unit_en)}</Chip>
            <Chip label="Unit AR">
              <RtlText as="span">{detail.unit_ar}</RtlText>
            </Chip>
            <Chip label="Polarity">{orDash(detail.polarity_en)}</Chip>
            <Chip label="Format" mono>
              {orDash(detail.format)}
            </Chip>
            <Chip label="Target">
              {detail.target_value === null
                ? 'None set'
                : `${formatValue(detail.target_value)}${
                    detail.target_year ? ` by ${detail.target_year}` : ''
                  }`}
            </Chip>
            <Chip label="Baseline">
              {detail.baseline_value === null
                ? 'None set'
                : `${formatValue(detail.baseline_value)}${
                    detail.baseline_year ? ` in ${detail.baseline_year}` : ''
                  }`}
            </Chip>
            <Chip label="Data points">{formatCount(detail.data_points)}</Chip>
            <Chip label="Source">{orDash(detail.data_source_en)}</Chip>
          </div>

          {detail.definition_en && (
            <div className="mt-3.5 max-w-4xl border-t border-line pt-3">
              <Eyebrow>Definition</Eyebrow>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
                {detail.definition_en}
              </p>
            </div>
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-3 gap-4">
        <Panel
          title="Actual against target"
          subtitle={
            hasTarget
              ? 'Actual in maroon, target in grey.'
              : 'No target is set for this indicator, so only the actual series is drawn.'
          }
          className="col-span-2"
        >
          {series.length === 0 ? (
            <EmptyState
              title="No series is loaded for this indicator"
              body="The indicator exists in the catalogue but has no data points, so the assistant cannot answer a value question about it."
            />
          ) : (
            <div className="px-4 py-3.5">
              <ColumnChart
                mode="grouped"
                height={188}
                formatTick={(value) => formatValue(value)}
                columns={series.map((point, index) => ({
                  label: point.period_label ?? '',
                  axisLabel:
                    index % Math.ceil(series.length / 8) === 0
                      ? (point.period_label ?? '')
                      : '',
                  values: { actual: point.actual, target: point.target },
                  title: `${point.period_label ?? DASH}\nActual: ${formatValue(
                    point.actual,
                  )}\nTarget: ${formatValue(point.target)}${
                    point.outlook !== null ? `\nOutlook: ${formatValue(point.outlook)}` : ''
                  }`,
                }))}
                series={[
                  { key: 'actual', label: 'Actual', className: 'bg-maroon' },
                  { key: 'target', label: 'Target', className: 'bg-line-strong' },
                ]}
              />

              <p className="mt-3 border-t border-line pt-2.5 text-[11.5px] leading-relaxed text-ink-2">
                Loaded range {orDash(detail.first_period)} to{' '}
                <span className="font-medium">{orDash(detail.last_period)}</span>, across{' '}
                {formatCount(detail.data_points)} data points.
                {band === 'stale' || band === 'ageing' ? (
                  <>
                    {' '}
                    The series ends {years} years ago, which is why questions about the
                    current period get refused for this indicator — the data is not there
                    to answer them.
                  </>
                ) : null}
              </p>
            </div>
          )}
        </Panel>

        <Panel
          title="Where these numbers came from"
          subtitle="Answered on the same screen as the number being questioned."
        >
          {detail.provenance.length === 0 ? (
            <EmptyState
              title="No load is recorded"
              body="No ETL load has been recorded against the tables behind this indicator."
            />
          ) : (
            <ul className="divide-y divide-line">
              {detail.provenance.map((row, index) => (
                <li key={`${row.table_name}-${index}`} className="px-4 py-2.5">
                  <Mono className="text-ink-1">{row.table_name}</Mono>
                  <p className="mt-1 break-all text-[11px] text-ink-3">
                    {orDash(row.source_file)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-ink-4">
                    <CopyDigest digest={row.file_sha256} />
                    <span className="tnum">
                      {formatCount(row.rows_in_file)} in file →{' '}
                      {formatCount(row.rows_in_table)} in table
                    </span>
                    <span title={formatAbsolute(row.loaded_at)}>
                      {row.loaded_at ? formatRelative(row.loaded_at) : DASH}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Series rows" subtitle="Every loaded period for this indicator.">
        {series.length === 0 ? (
          <EmptyState title="No rows" body="Nothing is loaded for this indicator." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-line bg-sunken text-left">
                  {['Period', 'Granularity', 'Country', 'Actual', 'Target', 'Outlook', 'Record id'].map(
                    (header, index) => (
                      <th
                        key={header}
                        className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-4 ${
                          index >= 3 && index <= 5 ? 'text-right' : 'text-left'
                        }`}
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {[...series].reverse().map((point) => (
                  <tr key={point.record_id} className="border-b border-rowline">
                    <td className="px-3 py-1.5 font-medium text-ink-1">
                      {orDash(point.period_label)}
                    </td>
                    <td className="px-3 py-1.5">
                      <Mono className="text-ink-3">{orDash(point.granularity)}</Mono>
                    </td>
                    <td className="px-3 py-1.5 text-ink-3">{orDash(point.country_en)}</td>
                    <td className="tnum px-3 py-1.5 text-right font-medium text-ink-1">
                      {formatValue(point.actual)}
                    </td>
                    <td className="tnum px-3 py-1.5 text-right text-ink-2">
                      {formatValue(point.target)}
                    </td>
                    <td className="tnum px-3 py-1.5 text-right text-ink-2">
                      {formatValue(point.outlook)}
                    </td>
                    <td className="px-3 py-1.5">
                      <Mono className="text-ink-4" title={point.record_id}>
                        {point.record_id.slice(0, 12)}
                      </Mono>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
