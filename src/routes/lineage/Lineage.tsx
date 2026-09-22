import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApp, useQueryScope } from '../../app/AppContext'
import { groupByTable } from '../../api/mock'
import type { Lineage as LineagePayload } from '../../api/types'
import { COPY } from '../../copy'
import { HBar } from '../../components/BarSeries'
import { CopyDigest } from '../../components/CopyDigest'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState, LoadingState } from '../../components/ErrorState'
import { KpiCard, Panel } from '../../components/KpiCard'
import { Eyebrow, Mono, StatusPill } from '../../components/StatusPill'
import {
  DASH,
  formatAbsolute,
  formatBytes,
  formatCount,
  formatRelative,
  orDash,
} from '../../lib/format'

export default function Lineage() {
  const { transport } = useApp()
  const scope = useQueryScope()

  const query = useQuery({
    queryKey: [...scope, 'lineage'],
    queryFn: () => transport.lineage(),
  })

  if (query.isPending) return <LoadingState label="the data lineage" />
  if (query.isError) {
    return (
      <ErrorState
        what="the data lineage"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  }

  return <LineageBody data={query.data} />
}

function LineageBody({ data }: { data: LineagePayload }) {
  // Grouped by table: three tables are fed by two files each, so the flat rows
  // would double-count.
  const groups = useMemo(() => groupByTable(data.tables), [data.tables])

  const rowsInFiles = groups.reduce((sum, group) => sum + group.rows_in_file, 0)
  const rowsInTables = groups.reduce((sum, group) => sum + group.rows_in_table, 0)
  const dropped = rowsInFiles - rowsInTables
  const files = groups.reduce((sum, group) => sum + group.files.length, 0)
  const maxDropped = groups.reduce((max, group) => Math.max(max, group.dropped), 0)

  if (!data.tables.length) {
    return (
      <Panel>
        <EmptyState
          title="No ETL load has been recorded"
          body="Nothing has been loaded from an export file, so there is no table-to-spreadsheet map to show yet."
        />
      </Panel>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Last load"
          value={
            data.load.finished_at ? formatRelative(data.load.finished_at) : DASH
          }
          note={data.load.finished_at ? formatAbsolute(data.load.finished_at) : undefined}
        />
        <KpiCard
          label="Tables loaded"
          value={formatCount(groups.length)}
          note={`from ${formatCount(files)} export files`}
        />
        <KpiCard label="Rows in files" value={formatCount(rowsInFiles)} />
        <KpiCard
          label="Rows dropped on load"
          value={formatCount(dropped)}
          note={`${formatCount(rowsInTables)} rows landed in tables`}
        />
      </div>

      <Panel
        title="Tables and the files that feed them"
        subtitle={COPY.droppedRowsFootnote}
      >
        <ul className="divide-y divide-line">
          {groups.map((group) => (
            <li key={group.table_name} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                <Mono className="text-[12.5px] font-medium text-ink-1">
                  {group.table_name}
                </Mono>
                {group.files.length > 1 && (
                  <StatusPill
                    tone="neutral"
                    title="This table is fed by more than one export file, so its rows are summed across them."
                  >
                    {group.files.length} files
                  </StatusPill>
                )}
                <span className="tnum ml-auto flex items-center gap-3 text-[11.5px] text-ink-3">
                  <span>
                    {formatCount(group.rows_in_file)} in files →{' '}
                    <span className="font-medium text-ink-1">
                      {formatCount(group.rows_in_table)}
                    </span>{' '}
                    in table
                  </span>
                  {group.dropped > 0 ? (
                    <span className="flex items-center gap-2">
                      <HBar
                        value={group.dropped}
                        max={maxDropped}
                        tone="gold"
                        width="w-20"
                      />
                      <StatusPill tone="gold">
                        {formatCount(group.dropped)} dropped
                      </StatusPill>
                    </span>
                  ) : (
                    <StatusPill tone="neutral">No rows dropped</StatusPill>
                  )}
                </span>
              </div>

              {group.note && (
                <p className="mt-1.5 max-w-4xl text-[11px] leading-relaxed text-ink-3">
                  {group.note}
                </p>
              )}
              {group.dropped > 0 && !group.note && (
                <p className="mt-1.5 max-w-4xl text-[11px] leading-relaxed text-ink-3">
                  {formatCount(group.dropped)} rows in the files are not in the table. No
                  note is recorded for this gap, so it is worth confirming with whoever
                  cuts the export.
                </p>
              )}

              <table className="mt-2 w-full border-collapse text-[11.5px]">
                <thead>
                  <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-4">
                    <th className="py-1 font-semibold">Source file</th>
                    <th className="w-[124px] py-1 font-semibold">Digest</th>
                    <th className="w-[100px] py-1 font-semibold">Loader</th>
                    <th className="w-[78px] py-1 text-right font-semibold">Rows</th>
                    <th className="w-[72px] py-1 text-right font-semibold">Size</th>
                    <th className="w-[112px] py-1 text-right font-semibold">Modified</th>
                  </tr>
                </thead>
                <tbody>
                  {group.files.map((file) => (
                    <tr key={file.source_file} className="border-t border-rowline">
                      <td className="break-all py-1.5 pr-3 text-ink-2">
                        {orDash(file.source_file)}
                      </td>
                      <td className="py-1.5">
                        <CopyDigest digest={file.file_sha256} />
                      </td>
                      <td className="py-1.5">
                        <Mono className="text-ink-3">{orDash(file.loader)}</Mono>
                      </td>
                      <td className="tnum py-1.5 text-right text-ink-2">
                        {formatCount(file.rows_in_file)}
                      </td>
                      <td className="tnum py-1.5 text-right text-ink-3">
                        {formatBytes(file.file_bytes)}
                      </td>
                      <td
                        className="py-1.5 text-right text-ink-3"
                        title={formatAbsolute(file.file_modified_at)}
                      >
                        {file.file_modified_at ? formatRelative(file.file_modified_at) : DASH}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          ))}
        </ul>
        <p className="border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-ink-3">
          {COPY.digestFootnote}
        </p>
      </Panel>

      <div className="grid grid-cols-2 gap-4">
        <Panel
          title="Tables no export feeds"
          subtitle={COPY.notLoadedIntro}
        >
          {data.not_loaded_by_etl.length === 0 ? (
            <EmptyState
              title="Every table has an export behind it"
              body="No table is written outside the ETL."
            />
          ) : (
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-line bg-sunken text-left">
                  <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-4">
                    Table
                  </th>
                  <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-4">
                    Approx. rows
                  </th>
                  <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-4">
                    Fed by
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.not_loaded_by_etl.map((row) => (
                  <tr key={row.table_name} className="border-b border-rowline">
                    <td className="px-4 py-2">
                      <Mono className="text-ink-1">{row.table_name}</Mono>
                    </td>
                    <td className="tnum px-4 py-2 text-right text-ink-2">
                      {formatCount(row.approx_rows)}
                    </td>
                    <td className="px-4 py-2">
                      <StatusPill tone="muted">The running application</StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Load history" subtitle="The last 20 recorded loads.">
          {data.history.length === 0 ? (
            <EmptyState title="No load history" body="No previous load is recorded." />
          ) : (
            <div className="px-4 py-3.5">
              <div className="flex items-end gap-[3px]">
                {[...data.history].reverse().map((load) => {
                  const max = Math.max(...data.history.map((h) => h.rows_loaded), 1)
                  return (
                    <span
                      key={load.load_id}
                      title={`${formatAbsolute(load.finished_at)}\n${formatCount(
                        load.rows_loaded,
                      )} rows across ${load.tables} tables`}
                      className="min-w-0 flex-1 bg-steel hover:bg-maroon"
                      style={{ height: `${(load.rows_loaded / max) * 56 + 4}px` }}
                    />
                  )
                })}
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-ink-4">
                <span>
                  {formatAbsolute(
                    data.history[data.history.length - 1]?.finished_at,
                  ).slice(0, 11)}
                </span>
                <span>{formatAbsolute(data.history[0]?.finished_at).slice(0, 11)}</span>
              </div>

              <ul className="mt-3 divide-y divide-rowline border-t border-line">
                {data.history.slice(0, 6).map((load) => (
                  <li
                    key={load.load_id}
                    className="flex items-baseline justify-between gap-3 py-1.5 text-[11.5px]"
                  >
                    <Mono className="text-ink-4" title={load.load_id}>
                      {load.load_id.slice(0, 8)}
                    </Mono>
                    <span className="text-ink-3" title={formatAbsolute(load.finished_at)}>
                      {load.finished_at ? formatRelative(load.finished_at) : DASH}
                    </span>
                    <span className="tnum text-ink-2">
                      {formatCount(load.rows_loaded)} rows
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      <Panel>
        <div className="px-4 py-3">
          <Eyebrow>This load</Eyebrow>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[11.5px] text-ink-3">
            <span>
              <Mono className="text-ink-2" title={data.load.load_id}>
                {data.load.load_id}
              </Mono>
            </span>
            <span title={formatAbsolute(data.load.started_at)}>
              Started {data.load.started_at ? formatRelative(data.load.started_at) : DASH}
            </span>
            <span title={formatAbsolute(data.load.finished_at)}>
              Finished{' '}
              {data.load.finished_at ? formatRelative(data.load.finished_at) : DASH}
            </span>
            <span className="tnum">
              {formatCount(data.load.source_files)} files · {formatCount(data.load.tables)}{' '}
              tables · {formatCount(data.load.rows_in_files)} rows in files
            </span>
          </div>
          {data.load.rows_in_files !== rowsInFiles && (
            <p className="mt-2 text-[11px] leading-relaxed text-gold-ink">
              The load header reports {formatCount(data.load.rows_in_files)} rows in files
              but the per-table rows sum to {formatCount(rowsInFiles)}. The grouped totals
              above are computed from the rows, not from the header.
            </p>
          )}
        </div>
      </Panel>
    </div>
  )
}

