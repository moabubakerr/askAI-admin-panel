import type { Lineage, LineageHistoryRow, LineageTableRow } from '../types'
import { guid, sha256 } from './ids'

const LOAD_ID = guid('load-2026-09-01')

interface FileSeed {
  table: string
  file: string
  loader: string
  rows_in_file: number
  /** Same value on every file feeding one table — it is the table's row count. */
  rows_in_table: number
  bytes: number
  modified: string
  started: string
  finished: string
}

/**
 * Ten export files feeding seven tables. Three tables are fed by two files
 * each, so the same table_name legitimately appears twice with the same
 * rows_in_table — which is why the lineage screen groups by table.
 */
const FILE_SEEDS: FileSeed[] = [
  {
    table: 'indicators',
    file: 'indicator_export_2026_09_01.xlsx',
    loader: 'xlsx_bulk',
    rows_in_file: 531,
    rows_in_table: 470,
    bytes: 412_688,
    modified: '2026-08-31T18:42:00Z',
    started: '2026-09-01T02:11:02Z',
    finished: '2026-09-01T02:11:48Z',
  },
  {
    table: 'indicator_details',
    file: 'indicator_details_export_2026_09_01.xlsx',
    loader: 'xlsx_bulk',
    rows_in_file: 612,
    rows_in_table: 588,
    bytes: 501_224,
    modified: '2026-08-31T18:44:00Z',
    started: '2026-09-01T02:12:09Z',
    finished: '2026-09-01T02:12:55Z',
  },
  {
    table: 'indicator_details',
    file: 'indicator_details_supplement_2026_09_01.xlsx',
    loader: 'xlsx_upsert',
    rows_in_file: 94,
    rows_in_table: 588,
    bytes: 88_104,
    modified: '2026-08-31T18:45:00Z',
    started: '2026-09-01T02:12:56Z',
    finished: '2026-09-01T02:13:11Z',
  },
  {
    table: 'published_data_points',
    file: 'published_data_points_2026_09_01.xlsx',
    loader: 'xlsx_bulk',
    rows_in_file: 18_420,
    rows_in_table: 23_890,
    bytes: 6_214_880,
    modified: '2026-08-31T19:02:00Z',
    started: '2026-09-01T02:14:38Z',
    finished: '2026-09-01T02:15:52Z',
  },
  {
    table: 'published_data_points',
    file: 'published_data_points_history_2026_09_01.xlsx',
    loader: 'xlsx_upsert',
    rows_in_file: 6_240,
    rows_in_table: 23_890,
    bytes: 2_106_448,
    modified: '2026-08-31T19:04:00Z',
    started: '2026-09-01T02:15:53Z',
    finished: '2026-09-01T02:16:40Z',
  },
  {
    table: 'indicator_values',
    file: 'indicator_values_export_2026_09_01.xlsx',
    loader: 'xlsx_bulk',
    rows_in_file: 9_310,
    rows_in_table: 10_490,
    bytes: 3_402_112,
    modified: '2026-08-31T19:10:00Z',
    started: '2026-09-01T02:16:51Z',
    finished: '2026-09-01T02:17:38Z',
  },
  {
    table: 'indicator_values',
    file: 'indicator_values_outlook_2026_09_01.xlsx',
    loader: 'xlsx_upsert',
    rows_in_file: 1_180,
    rows_in_table: 10_490,
    bytes: 402_880,
    modified: '2026-08-31T19:11:00Z',
    started: '2026-09-01T02:17:39Z',
    finished: '2026-09-01T02:17:52Z',
  },
  {
    table: 'indicator_analysis',
    file: 'indicator_analysis_2026_08_15.xlsx',
    loader: 'xlsx_bulk',
    rows_in_file: 412,
    rows_in_table: 412,
    bytes: 288_016,
    modified: '2026-08-15T02:40:00Z',
    started: '2026-09-01T02:18:04Z',
    finished: '2026-09-01T02:18:22Z',
  },
  {
    table: 'countries',
    file: 'countries_reference_2026_06_01.xlsx',
    loader: 'csv_reference',
    rows_in_file: 249,
    rows_in_table: 249,
    bytes: 41_992,
    modified: '2026-06-01T01:20:00Z',
    started: '2026-09-01T02:18:30Z',
    finished: '2026-09-01T02:18:36Z',
  },
  {
    table: 'units',
    file: 'units_reference_2026_06_01.xlsx',
    loader: 'csv_reference',
    rows_in_file: 86,
    rows_in_table: 84,
    bytes: 18_440,
    modified: '2026-06-01T01:21:00Z',
    started: '2026-09-01T02:18:37Z',
    finished: '2026-09-01T02:18:41Z',
  },
]

/**
 * Why each table loads fewer rows than its files hold. Gaps here are expected
 * and intentional, so the screen presents them as information, not failures.
 */
export const GAP_NOTES: Record<string, string> = {
  indicators:
    '531 rows in the export become 470 loaded indicators. The other 61 are nameless stubs with neither an English nor an Arabic name, and the loader skips them by design.',
  indicator_details:
    'The supplement file re-states details that are already in the main export. Duplicates collapse on load, so the two files together hold more rows than the table needs.',
  published_data_points:
    'The history file overlaps the main export across the last two years. Overlapping periods are written once, so the combined file count exceeds the loaded row count.',
  units:
    'Two unit rows carry no English label and are skipped, because the assistant has nothing to render for them.',
}

const TABLES: LineageTableRow[] = FILE_SEEDS.map((seed) => ({
  load_id: LOAD_ID,
  table_name: seed.table,
  source_file: seed.file,
  loader: seed.loader,
  file_sha256: sha256(seed.file.replace(/\.xlsx$/, '')),
  file_bytes: seed.bytes,
  file_modified_at: seed.modified,
  rows_in_file: seed.rows_in_file,
  rows_in_table: seed.rows_in_table,
  started_at: seed.started,
  finished_at: seed.finished,
}))

const DISTINCT_TABLES = new Set(TABLES.map((row) => row.table_name))

function buildHistory(): LineageHistoryRow[] {
  const rows: LineageHistoryRow[] = []
  for (let i = 0; i < 20; i++) {
    const finished = new Date('2026-09-01T02:18:44Z')
    finished.setUTCDate(finished.getUTCDate() - i * 14)
    const wobble = Math.round(Math.sin(i * 1.3) * 420)
    rows.push({
      load_id: i === 0 ? LOAD_ID : guid(`load-history-${i}`),
      finished_at: finished.toISOString(),
      tables: DISTINCT_TABLES.size,
      rows_loaded: 36_183 - i * 118 + wobble,
    })
  }
  return rows
}

export const LINEAGE: Lineage = {
  load: {
    load_id: LOAD_ID,
    started_at: '2026-09-01T02:11:02Z',
    finished_at: '2026-09-01T02:18:44Z',
    tables: DISTINCT_TABLES.size,
    source_files: TABLES.length,
    // Derived, so the summary tiles cannot disagree with the grouped rows.
    rows_in_files: TABLES.reduce((sum, row) => sum + (row.rows_in_file ?? 0), 0),
  },
  tables: TABLES,
  not_loaded_by_etl: [
    { table_name: 'chat_messages', approx_rows: 4_820 },
    { table_name: 'chat_feedback', approx_rows: 612 },
    { table_name: 'indicator_embeddings', approx_rows: 470 },
    { table_name: 'admin_sessions', approx_rows: 12 },
  ],
  history: buildHistory(),
}

export interface TableGroup {
  table_name: string
  files: LineageTableRow[]
  rows_in_file: number
  rows_in_table: number
  dropped: number
  note: string | null
  finished_at: string | null
}

/**
 * Group by table, summing rows_in_file across the files that feed it. Never
 * list the flat rows: three tables appear twice and would double-count.
 */
export function groupByTable(tables: LineageTableRow[]): TableGroup[] {
  const groups = new Map<string, TableGroup>()
  for (const row of tables) {
    let group = groups.get(row.table_name)
    if (!group) {
      group = {
        table_name: row.table_name,
        files: [],
        rows_in_file: 0,
        rows_in_table: row.rows_in_table ?? 0,
        dropped: 0,
        note: GAP_NOTES[row.table_name] ?? null,
        finished_at: row.finished_at,
      }
      groups.set(row.table_name, group)
    }
    group.files.push(row)
    group.rows_in_file += row.rows_in_file ?? 0
    // Every file feeding a table reports the same table row count.
    group.rows_in_table = row.rows_in_table ?? group.rows_in_table
    if (row.finished_at && (!group.finished_at || row.finished_at > group.finished_at)) {
      group.finished_at = row.finished_at
    }
  }
  for (const group of groups.values()) {
    group.dropped = group.rows_in_file - group.rows_in_table
  }
  return [...groups.values()].sort((a, b) => b.dropped - a.dropped)
}
