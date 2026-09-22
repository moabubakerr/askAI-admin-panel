import { COPY } from '../copy'
import { ApiError, type AdminTransport, type CatalogueFilters } from './transport'
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
  Provenance,
  Stats,
} from './types'

/**
 * The API is always same-origin, reached through this relative prefix. nginx
 * serves the panel and proxies `/api/*` to the upstream, stripping the prefix.
 *
 * This is a compile-time constant on purpose. It is deliberately NOT an
 * environment variable and NOT runtime-configurable: the API has no CORS
 * middleware, so any absolute origin in the bundle fails preflight in the
 * browser. There is no host, port or scheme anywhere in the built output, and
 * nothing that could put one there. Point the deployment somewhere else by
 * changing `API_UPSTREAM` on the container, never by rebuilding the bundle.
 */
export const API_PREFIX = '/api'

/** Pull FastAPI's `detail` out of a body, whatever shape it took. */
function detailFrom(body: unknown, fallback: string): string {
  if (typeof body === 'string' && body.trim()) return body.trim()
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail
    if (typeof detail === 'string' && detail.trim()) return detail.trim()
    if (Array.isArray(detail)) {
      const parts = detail
        .map((d) =>
          d && typeof d === 'object' && 'msg' in d
            ? String((d as { msg: unknown }).msg)
            : null,
        )
        .filter((s): s is string => Boolean(s))
      if (parts.length) return parts.join('; ')
    }
  }
  return fallback
}

type ParamValue = string | number | boolean | null | undefined

function query(params: Record<string, ParamValue>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export interface ClientOptions {
  getToken: () => string | null
  /** Called on any 401 so the app can drop the token and return to login. */
  onSessionEnded: () => void
}

export function createLiveTransport(options: ClientOptions): AdminTransport {
  const base = API_PREFIX

  async function request<T>(
    path: string,
    init: { method?: 'GET' | 'POST'; body?: unknown; auth?: boolean } = {},
  ): Promise<T> {
    const { method = 'GET', body, auth = true } = init
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (auth) {
      const token = options.getToken()
      if (!token) {
        options.onSessionEnded()
        throw new ApiError('session-ended', 401, COPY.sessionEnded)
      }
      headers.Authorization = `Bearer ${token}`
    }

    let response: Response
    try {
      response = await fetch(base + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new ApiError(
        'network',
        0,
        `The request to ${base} did not complete. The panel and the API share one origin, so this is the panel's own server failing to reach the upstream — check that the API container is up and that API_UPSTREAM points at it.`,
      )
    }

    const text = await response.text()
    let parsed: unknown = null
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = text
      }
    }

    if (response.ok) return parsed as T

    if (response.status === 401) {
      if (auth) options.onSessionEnded()
      throw new ApiError('session-ended', 401, COPY.sessionEnded)
    }
    if (response.status === 503) {
      throw new ApiError('api-disabled', 503, COPY.apiDisabledTitle)
    }
    if (response.status === 404) {
      throw new ApiError('not-found', 404, detailFrom(parsed, 'Not found.'))
    }
    throw new ApiError(
      'http',
      response.status,
      detailFrom(parsed, `The API returned HTTP ${response.status}.`),
    )
  }

  return {
    login: (username, password) =>
      request<LoginResponse>('/admin/login', {
        method: 'POST',
        body: { username, password },
        auth: false,
      }),
    me: () => request<MeResponse>('/admin/me'),
    logout: () => request<LogoutResponse>('/admin/logout', { method: 'POST' }),
    stats: () => request<Stats>('/admin/stats'),
    messages: (filters: MessageFilters) =>
      request<Paged<MessageRow>>(`/admin/messages${query({ ...filters })}`),
    provenance: (messageId: string) =>
      request<Provenance>(
        `/admin/messages/${encodeURIComponent(messageId)}/provenance`,
      ),
    catalogue: (filters: CatalogueFilters) =>
      request<Paged<CatalogueRow>>(`/admin/catalogue${query({ ...filters })}`),
    catalogueDetail: (id: string) =>
      request<CatalogueDetail>(`/admin/catalogue/${encodeURIComponent(id)}`),
    lineage: () => request<Lineage>('/admin/lineage'),
  }
}
