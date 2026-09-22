import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { API_PREFIX } from '../api/client'
import { useApp, useQueryScope } from '../app/AppContext'
import { COPY } from '../copy'
import { formatAbsolute, formatCount, formatRelative } from '../lib/format'
import { Button } from './controls'
import { Eyebrow } from './StatusPill'

const BUILD = 'build 2026.09.22-1'

interface NavItem {
  to: string
  label: string
  badge?: 'unverified'
}

const GROUPS: Array<{ group: string; items: NavItem[] }> = [
  {
    group: 'Monitoring',
    items: [
      { to: '/', label: 'Overview' },
      { to: '/conversations', label: 'Conversations', badge: 'unverified' },
    ],
  },
  {
    group: 'Knowledge base',
    items: [
      { to: '/catalogue', label: 'Indicator catalogue' },
      { to: '/lineage', label: 'Data lineage' },
    ],
  },
  {
    group: 'Administration',
    items: [{ to: '/users', label: 'Users and access' }],
  },
]

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Overview',
    subtitle: 'Answer quality, refusals and latency across the assistant',
  },
  '/conversations': {
    title: 'Conversations',
    subtitle: 'Every logged question, with the answer and the check that ran on it',
  },
  '/catalogue': {
    title: 'Indicator catalogue',
    subtitle: 'What the assistant can answer from, and how current it is',
  },
  '/lineage': {
    title: 'Data lineage',
    subtitle: 'Which spreadsheet each table was loaded from',
  },
  '/users': {
    title: 'Users and access',
    subtitle: 'Panel accounts and recent admin activity',
  },
}

function titleFor(pathname: string): { title: string; subtitle: string } {
  if (pathname.startsWith('/conversations/')) {
    return {
      title: 'Answer provenance',
      subtitle: 'The chain from the question to the spreadsheet the number came from',
    }
  }
  if (pathname.startsWith('/catalogue/')) {
    return {
      title: 'Indicator detail',
      subtitle: 'Series, targets and the export files behind them',
    }
  }
  return TITLES[pathname] ?? { title: 'Admin console', subtitle: '' }
}

export default function Shell() {
  const { pathname } = useLocation()
  const { title, subtitle } = titleFor(pathname)

  return (
    <div className="flex min-h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} subtitle={subtitle} />
        <main className="min-w-0 flex-1 px-[22px] py-[20px]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Sidebar() {
  const { signOut, transport } = useApp()
  const scope = useQueryScope()

  // The badge reads the same stats payload the Overview uses.
  const stats = useQuery({
    queryKey: [...scope, 'stats'],
    queryFn: () => transport.stats(),
    staleTime: 60_000,
  })
  const unverified = stats.data?.overall.unverified ?? null

  return (
    <aside
      className="flex w-[236px] shrink-0 flex-col text-white"
      style={{ background: 'linear-gradient(180deg,#2a0810,#170609)' }}
    >
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-[7px] font-semibold text-[#2a0810]"
          style={{ background: 'linear-gradient(160deg,#e3c655,#c9a227)' }}
          aria-hidden
        >
          S
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold">SCEAI Assistant</span>
          <span className="block text-[9px] font-semibold uppercase tracking-[0.1em] text-white/45">
            Admin console
          </span>
        </span>
      </div>

      <nav className="mt-1 flex-1 overflow-y-auto pb-4">
        {GROUPS.map((group) => (
          <div key={group.group} className="mt-3.5">
            <div className="px-4 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.11em] text-white/35">
              {group.group}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `relative flex items-center justify-between gap-2 px-4 py-[7px] text-[12.5px] ${
                    isActive
                      ? 'bg-maroon font-medium text-white'
                      : 'text-white/70 hover:bg-white/6 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-[3px] bg-gold"
                      />
                    )}
                    <span className="truncate">{item.label}</span>
                    {item.badge === 'unverified' && unverified ? (
                      <span
                        title={`${unverified} answers failed the automatic numeric check`}
                        className="tnum shrink-0 rounded-full bg-gold px-1.5 text-[10px] font-semibold text-[#2a0810]"
                      >
                        {formatCount(unverified)}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <div className="font-mono text-[10px] text-white/35">{BUILD}</div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-1.5 text-[11.5px] text-white/60 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}

function TopBar({ title, subtitle }: { title: string; subtitle: string }) {
  const { mock, setMock } = useApp()

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-4 border-b border-line bg-surface px-[22px]">
      <div className="min-w-0">
        <h1 className="truncate text-[14px] font-semibold leading-tight text-ink-1">
          {title}
        </h1>
        <p className="truncate text-[11px] leading-tight text-ink-3">{subtitle}</p>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* The API is same-origin through /api. There is deliberately no field
            here: an absolute origin in the bundle would fail CORS preflight,
            since the API serves no CORS headers. The upstream is chosen by
            API_UPSTREAM on the container. */}
        <span
          className="font-mono text-[11px] text-ink-4"
          title="The panel and the API share one origin. nginx proxies /api to API_UPSTREAM and strips the prefix."
        >
          {API_PREFIX} → same origin
        </span>

        <button
          type="button"
          onClick={() => setMock(!mock)}
          title={
            mock
              ? 'Mock mode: fixtures only, no request leaves the browser. Click to switch to the live API.'
              : 'Live mode: calls the API through /api on this origin. Click to switch back to mock data.'
          }
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            mock
              ? 'border-gold-border bg-gold-tint text-gold-ink'
              : 'border-ok bg-ok-bg text-ok'
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${mock ? 'bg-gold' : 'bg-ok'}`}
            aria-hidden
          />
          {mock ? 'Mock data' : 'Live API'}
        </button>

        <UserChip />
      </div>
    </header>
  )
}

function UserChip() {
  const { session, signOut, simulateExpired } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const initials = (session?.username ?? '?').slice(0, 2).toUpperCase()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-[7px] border border-line px-1.5 py-1 hover:bg-sunken"
      >
        <span className="grid size-6 place-items-center rounded-full bg-maroon text-[10px] font-semibold text-white">
          {initials}
        </span>
        <span className="max-w-[92px] truncate text-[12px] text-ink-2">
          {session?.username ?? 'Signed out'}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-[268px] rounded-[10px] border border-line bg-surface p-3 shadow-menu"
        >
          <Eyebrow>Session</Eyebrow>
          <p className="mt-1 text-[12px] text-ink-2">{session?.username ?? '—'}</p>
          <p className="mt-0.5 text-[11px] text-ink-3">
            {session?.expiresAt
              ? `Token expires ${formatRelative(new Date(session.expiresAt).toISOString())}`
              : 'No expiry reported by the server'}
          </p>
          {session?.expiresAt && (
            <p className="font-mono text-[10px] text-ink-4">
              {formatAbsolute(new Date(session.expiresAt).toISOString())}
            </p>
          )}

          <p className="mt-2.5 border-t border-line pt-2.5 text-[11px] leading-relaxed text-ink-3">
            {COPY.tokensInMemory}
          </p>

          <div className="mt-2.5 flex flex-col gap-1.5">
            <Button onClick={simulateExpired}>Simulate expired token (401)</Button>
            <Button onClick={() => void signOut()}>Sign out</Button>
          </div>
        </div>
      )}
    </div>
  )
}
