import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createLiveTransport } from '../api/client'
import { createMockTransport } from '../api/mock'
import { ApiError, type AdminTransport } from '../api/transport'

/**
 * The token is kept in sessionStorage, not localStorage, so it does not outlive
 * the tab. It is a claim until /admin/me agrees on load.
 */
const TOKEN_KEY = 'sceai.admin.token'

function readToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string | null): void {
  try {
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token)
    else window.sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* memory-only fallback */
  }
}

export type AuthStatus = 'checking' | 'anonymous' | 'authed'

export interface Session {
  username: string
  /** Milliseconds since epoch, converted from the API's seconds. */
  expiresAt: number | null
}

interface AppValue {
  mock: boolean
  setMock: (mock: boolean) => void
  transport: AdminTransport
  authStatus: AuthStatus
  session: Session | null
  /** 503 — the admin API is switched off server-side. Not a failed sign-in. */
  apiDisabled: boolean
  /** Show the session-ended notice on the login screen. */
  sessionEnded: boolean
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  simulateExpired: () => void
  clearNotices: () => void
}

const AppCtx = createContext<AppValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  /**
   * Mock mode is on by default in development, so the whole panel is
   * explorable with no server. A production build defaults to live: a deployed
   * admin console that served invented figures until someone noticed the chip
   * would be worse than one that shows an honest error.
   */
  const [mock, setMockState] = useState(import.meta.env.DEV)
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() =>
    readToken() ? 'checking' : 'anonymous',
  )
  const [session, setSession] = useState<Session | null>(null)
  const [apiDisabled, setApiDisabled] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)

  const tokenRef = useRef<string | null>(readToken())

  const endSession = useCallback(() => {
    tokenRef.current = null
    writeToken(null)
    setSession(null)
    setAuthStatus('anonymous')
  }, [])

  const transport = useMemo<AdminTransport>(
    () =>
      mock
        ? createMockTransport()
        : createLiveTransport({
            getToken: () => tokenRef.current,
            onSessionEnded: () => {
              setSessionEnded(true)
              endSession()
            },
          }),
    [mock, endSession],
  )

  // Validate a stored token before any screen fetches data.
  useEffect(() => {
    if (authStatus !== 'checking') return
    let cancelled = false
    transport
      .me()
      .then((res) => {
        if (cancelled) return
        setSession({
          username: res.username,
          expiresAt: res.expires_at ? res.expires_at * 1000 : null,
        })
        setAuthStatus('authed')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof ApiError && error.kind === 'api-disabled') {
          setApiDisabled(true)
        }
        endSession()
      })
    return () => {
      cancelled = true
    }
  }, [authStatus, transport, endSession])

  const setMock = useCallback(
    (next: boolean) => {
      // A token issued in one mode means nothing in the other.
      setMockState(next)
      setApiDisabled(false)
      setSessionEnded(false)
      tokenRef.current = null
      writeToken(null)
      setSession(null)
      setAuthStatus('anonymous')
    },
    [],
  )

  const signIn = useCallback(
    async (username: string, password: string) => {
      setSessionEnded(false)
      try {
        const res = await transport.login(username, password)
        tokenRef.current = res.token
        writeToken(res.token)
        setApiDisabled(false)
        setSession({
          username: res.username,
          expiresAt: res.expires_at ? res.expires_at * 1000 : null,
        })
        setAuthStatus('authed')
      } catch (error) {
        if (error instanceof ApiError && error.kind === 'api-disabled') {
          setApiDisabled(true)
        }
        throw error
      }
    },
    [transport],
  )

  const signOut = useCallback(async () => {
    try {
      if (tokenRef.current) await transport.logout()
    } catch {
      // The local session ends either way.
    }
    setSessionEnded(false)
    endSession()
  }, [transport, endSession])

  const simulateExpired = useCallback(() => {
    setSessionEnded(true)
    endSession()
  }, [endSession])

  const clearNotices = useCallback(() => {
    setSessionEnded(false)
    setApiDisabled(false)
  }, [])

  const value = useMemo<AppValue>(
    () => ({
      mock,
      setMock,
      transport,
      authStatus,
      session,
      apiDisabled,
      sessionEnded,
      signIn,
      signOut,
      simulateExpired,
      clearNotices,
    }),
    [
      mock,
      setMock,
      transport,
      authStatus,
      session,
      apiDisabled,
      sessionEnded,
      signIn,
      signOut,
      simulateExpired,
      clearNotices,
    ],
  )

  return <AppCtx value={value}>{children}</AppCtx>
}

export function useApp(): AppValue {
  const value = use(AppCtx)
  if (!value) throw new Error('useApp must be used inside <AppProvider>')
  return value
}

/** Query keys must include the mode and base so switching refetches. */
export function useQueryScope(): [string, string] {
  const { mock } = useApp()
  return [mock ? 'mock' : 'live', 'same-origin']
}
