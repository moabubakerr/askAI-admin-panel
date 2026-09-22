import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useApp, useQueryScope } from '../../app/AppContext'
import { Panel } from '../../components/KpiCard'
import { Mono, StatusPill } from '../../components/StatusPill'
import { RtlText } from '../../components/RtlText'
import { formatCount, orDash } from '../../lib/format'

/**
 * Hex-ish and long enough to be an identifier rather than a name. Covers a
 * full GUID (with or without dashes) and a truncated sha256 as displayed in
 * the provenance panels.
 */
export function looksLikeId(value: string): boolean {
  const bare = value.trim().replace(/-/g, '')
  return bare.length >= 8 && /^[0-9a-f]+$/i.test(bare)
}

/**
 * Two different kinds of identifier appear in this panel and they are easy to
 * confuse:
 *
 *   - an indicator's `indicator_id`, `indicator_detail_id` or
 *     `published_detail_id` — a GUID, and what `/admin/catalogue/{id}` accepts
 *   - a `file_sha256` — the digest of a source export file, shown truncated to
 *     12 characters beside the numbers it loaded
 *
 * Searching the catalogue for a file digest can never match, because the
 * catalogue's `q` searches names. Rather than return nothing, this says which
 * kind of id was pasted and where it belongs.
 */
export function IdLookup({ query }: { query: string }) {
  const { transport } = useApp()
  const scope = useQueryScope()
  const q = query.trim().toLowerCase()
  const enabled = looksLikeId(q)

  const indicator = useQuery({
    queryKey: [...scope, 'id-lookup', q],
    queryFn: () => transport.catalogueDetail(q),
    retry: false,
    enabled,
  })

  // /admin/lineage returns every file in one payload, so matching a digest
  // prefix needs no extra endpoint.
  const lineage = useQuery({
    queryKey: [...scope, 'lineage'],
    queryFn: () => transport.lineage(),
    enabled,
  })

  if (!enabled) return null

  if (indicator.isPending || lineage.isPending) {
    return (
      <Panel>
        <p className="px-4 py-2.5 text-[12px] text-ink-3">Looking that id up…</p>
      </Panel>
    )
  }

  // 1. An indicator id.
  if (indicator.data) {
    const row = indicator.data
    const target =
      row.published_detail_id ?? row.indicator_detail_id ?? row.indicator_id
    return (
      <Panel>
        <Link
          to={`/catalogue/${target}`}
          className="block px-4 py-3 hover:bg-maroon-tint"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <StatusPill tone="ok">Matched an indicator by id</StatusPill>
              <div className="mt-1.5 text-[13px] font-medium text-ink-1">
                {orDash(row.name_en)}
              </div>
              {row.detail_name_en && (
                <div className="text-[11.5px] text-ink-4">{row.detail_name_en}</div>
              )}
              <RtlText as="div" className="mt-0.5 block text-[12px] text-ink-2">
                {row.name_ar}
              </RtlText>
            </div>
            <div className="shrink-0 text-right text-[11px] text-ink-3">
              <div>
                {formatCount(row.data_points)} points, to {orDash(row.last_period)}
              </div>
              <div className="mt-1 text-maroon">Open →</div>
            </div>
          </div>
        </Link>
      </Panel>
    )
  }

  // 2. A source-file digest, which is what the provenance panels show.
  const file = lineage.data?.tables.find((row) =>
    row.file_sha256?.toLowerCase().startsWith(q),
  )
  if (file) {
    return (
      <Panel>
        <div className="px-4 py-3">
          <StatusPill tone="gold">That is a source-file digest</StatusPill>
          <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-ink-2">
            It identifies the spreadsheet a number was loaded from, not an
            indicator, so the catalogue has nothing to match it against. It
            belongs on the data lineage screen.
          </p>
          <div className="mt-2 text-[12px]">
            <Mono className="text-ink-1">{file.table_name}</Mono>
            <span className="mx-2 text-ink-4">←</span>
            <span className="break-all text-ink-2">{orDash(file.source_file)}</span>
          </div>
          <Link
            to={`/lineage?q=${encodeURIComponent(q)}`}
            className="mt-2 inline-block text-[12px] font-medium text-maroon hover:underline"
          >
            Open it in data lineage →
          </Link>
        </div>
      </Panel>
    )
  }

  // 3. Neither.
  return (
    <Panel>
      <div className="px-4 py-3">
        <StatusPill tone="muted">No match for that id</StatusPill>
        <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-ink-2">
          No published indicator has that id, and no loaded source file has a
          digest starting with it. An indicator id is a GUID; a file digest is
          the 12 characters shown beside a source file. A partial indicator id
          will not match — the API resolves an indicator id only in full.
        </p>
      </div>
    </Panel>
  )
}
