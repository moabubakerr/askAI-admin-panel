/** One interface per API payload. No `any`. */

/* ---- auth ---- */

export interface LoginResponse {
  ok: boolean
  token: string
  /** UNIX timestamp in seconds. */
  expires_at: number
  username: string
}

export interface MeResponse {
  via: string
  username: string
  expires_at?: number
}

export interface LogoutResponse {
  ok: boolean
  ended: boolean
}

/* ---- paging ---- */

export interface Paged<TRow> {
  total: number
  limit: number
  offset: number
  rows: TRow[]
}

export interface PageParams {
  limit?: number
  offset?: number
}

export const DEFAULT_LIMIT = 50
export const MAX_LIMIT = 500

/* ---- stats ---- */

export interface StatsOverall {
  messages: number
  sessions: number
  refusals: number
  refusal_rate_pct: number | null
  unverified: number
  avg_latency_ms: number | null
  last_message_at: string | null
}

export interface StatsRatings {
  ratings: number
  avg_rating: number | null
  low_ratings: number
  with_comment: number
}

export interface RatingDistributionRow {
  rating: number
  n: number
}

export interface LanguageStatsRow {
  language: string | null
  messages: number
  refusals: number
  refusal_rate_pct: number | null
  avg_latency_ms: number | null
}

export interface AnswerShapeStatsRow {
  answer_shape: string | null
  messages: number
  ratings: number
  avg_rating: number | null
}

export interface TopIndicatorRow {
  indicator: string | null
  n: number
}

export interface Stats {
  overall: StatsOverall
  ratings: StatsRatings
  rating_distribution: RatingDistributionRow[]
  by_language: LanguageStatsRow[]
  by_answer_shape: AnswerShapeStatsRow[]
  top_indicators: TopIndicatorRow[]
  /**
   * Last 30 days of messages and refusals. Not in the documented /admin/stats
   * payload; the Overview chart derives it from the messages list when live,
   * and the fixtures provide it directly in mock mode.
   */
  by_day?: DailyCountRow[]
}

export interface DailyCountRow {
  day: string
  messages: number
  refusals: number
}

/* ---- messages ---- */

export interface MessageRow {
  message_id: string
  session_id: string
  asked_at: string
  endpoint: string | null
  language: string | null
  question: string | null
  answer: string | null
  answered: boolean
  answer_shape: string | null
  indicator: string | null
  period_label: string | null
  verified: boolean | null
  readable: boolean | null
  latency_ms: number | null
  rating: number | null
  comment: string | null
}

export interface MessageFilters extends PageParams {
  from?: string
  to?: string
  language?: 'en' | 'ar'
  answered?: boolean
  shape?: string
  q?: string
}

/* ---- provenance ---- */

export type SourceTable =
  | 'published_data_points'
  | 'indicator_values'
  | 'indicator_analysis'

export interface Citation {
  position: number
  source_table: SourceTable
  record_id: string
  indicator: string | null
  data_source: string | null
  period_label: string | null
  country: string | null
  /** false means the cited row no longer exists. Normal: the ETL reloads. */
  record_found: boolean
  published_indicator_detail_id: string | null
  indicator_id: string | null
  indicator_detail_id: string | null
  indicator_name_en: string | null
  indicator_name_ar: string | null
  unit_en: string | null
  is_main: boolean | null
  actual: number | null
  target: number | null
  outlook: number | null
  period_date: string | null
  granularity: string | null
  source_file: string | null
  file_sha256: string | null
  loaded_at: string | null
}

export interface Provenance {
  message: MessageRow
  unresolved_records: number
  citations: Citation[]
}

/* ---- catalogue ---- */

export interface CatalogueRow {
  indicator_id: string
  indicator_detail_id: string | null
  published_detail_id: string | null
  name_en: string | null
  name_ar: string | null
  detail_name_en: string | null
  indicator_type_en: string | null
  unit_en: string | null
  unit_ar: string | null
  format: string | null
  polarity_en: string | null
  target_value: number | null
  target_year: number | null
  baseline_value: number | null
  baseline_year: number | null
  data_source_en: string | null
  definition_en: string | null
  data_points: number | null
  first_period: string | null
  last_period: string | null
}

export interface SeriesPoint {
  record_id: string
  period_label: string | null
  period_date: string | null
  granularity: string | null
  country_en: string | null
  actual: number | null
  target: number | null
  outlook: number | null
}

export interface CatalogueProvenanceRow {
  table_name: string
  source_file: string | null
  file_sha256: string | null
  rows_in_file: number | null
  rows_in_table: number | null
  loaded_at: string | null
}

export interface CatalogueDetail extends CatalogueRow {
  series: SeriesPoint[]
  provenance: CatalogueProvenanceRow[]
  is_main?: boolean | null
}

/* ---- lineage ---- */

export interface LineageLoad {
  load_id: string
  started_at: string | null
  finished_at: string | null
  tables: number
  source_files: number
  rows_in_files: number
}

export interface LineageTableRow {
  load_id: string
  table_name: string
  source_file: string | null
  loader: string | null
  file_sha256: string | null
  file_bytes: number | null
  file_modified_at: string | null
  rows_in_file: number | null
  rows_in_table: number | null
  started_at: string | null
  finished_at: string | null
}

export interface NotLoadedRow {
  table_name: string
  approx_rows: number | null
}

export interface LineageHistoryRow {
  load_id: string
  finished_at: string | null
  tables: number
  rows_loaded: number
}

export interface Lineage {
  load: LineageLoad
  tables: LineageTableRow[]
  not_loaded_by_etl: NotLoadedRow[]
  history: LineageHistoryRow[]
}

/* ---- users and access (local only — not in the API spec) ---- */

export type UserRole = 'Administrator' | 'Analyst' | 'Viewer'
export type SignInVia = 'password' | 'sso' | 'api key'
export type AccountStatus = 'active' | 'idle' | 'suspended'

export interface Account {
  account_id: string
  username: string
  email: string
  role: UserRole
  via: SignInVia
  last_seen_at: string | null
  status: AccountStatus
}

export interface ActivityRow {
  activity_id: string
  at: string
  who: string
  what: string
}

/* ---- answer shapes ---- */

export const ANSWER_SHAPES = [
  'value',
  'series',
  'country_ranking',
  'country_comparison',
  'overview',
  'direction_split',
  'performance_ranking',
  'level_comparison',
  'derived_share',
  'direction',
  'period_comparison',
  'growth_rate',
  'min_max',
  'catalogue',
  'definition',
  'article',
  'disambiguation',
  'greeting',
  'refusal',
  'other',
] as const

export type AnswerShape = (typeof ANSWER_SHAPES)[number]
