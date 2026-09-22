import type {
  CatalogueDetail,
  CatalogueRow,
  Lineage,
  LoginResponse,
  LogoutResponse,
  MeResponse,
  MessageFilters,
  MessageRow,
  Paged,
  PageParams,
  Provenance,
  Stats,
} from './types'

export interface CatalogueFilters extends PageParams {
  q?: string
}

/**
 * The surface the panel talks to. The live client and the mock transport both
 * implement it, so screens never know which one they are using.
 */
export interface AdminTransport {
  login(username: string, password: string): Promise<LoginResponse>
  me(): Promise<MeResponse>
  logout(): Promise<LogoutResponse>
  stats(): Promise<Stats>
  messages(filters: MessageFilters): Promise<Paged<MessageRow>>
  provenance(messageId: string): Promise<Provenance>
  catalogue(filters: CatalogueFilters): Promise<Paged<CatalogueRow>>
  catalogueDetail(id: string): Promise<CatalogueDetail>
  lineage(): Promise<Lineage>
}

export type ApiErrorKind =
  /** 401 — the token is gone or the backend restarted. Return to login. */
  | 'session-ended'
  /** 503 — the admin API is switched off by a server setting. */
  | 'api-disabled'
  /** 404 — asked for something the server does not have. */
  | 'not-found'
  /** The request never reached the server. */
  | 'network'
  /** Anything else the server returned. */
  | 'http'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number

  constructor(kind: ApiErrorKind, status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}
