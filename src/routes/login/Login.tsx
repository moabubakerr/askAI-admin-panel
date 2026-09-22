import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/transport'
import { MOCK_PASSWORD, MOCK_USERNAME } from '../../api/mock'
import { useApp } from '../../app/AppContext'
import { COPY } from '../../copy'
import { TextInput } from '../../components/controls'
import { Eyebrow } from '../../components/StatusPill'

export default function Login() {
  const { signIn, apiDisabled, sessionEnded, mock } = useApp()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // A real 503 from the server still shows the disabled state below; only the
  // link that simulated it has been removed.
  const disabled = apiDisabled

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await signIn(username, password)
    } catch (caught) {
      if (caught instanceof ApiError && caught.kind === 'api-disabled') {
        setError(null)
      } else {
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'Sign-in failed before the server answered.',
        )
      }
      setPassword('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-full">
      {/* Left: institutional panel in the dark plum gradient. */}
      <div
        className="hairline-geometry relative hidden w-[46%] shrink-0 overflow-hidden lg:block"
        style={{ background: 'linear-gradient(180deg,#2a0810,#170609)' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-16 size-[420px] rotate-[24deg] border border-white/8"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 bottom-8 size-[360px] rotate-[18deg] border border-white/6"
        />
        {/* Brand lockup only. The explanatory copy and the mode/503 links were
            removed at the deployment's request. */}
        <div className="relative flex h-full flex-col p-10 text-white">
          <div className="flex items-center gap-3">
            <span
              className="grid size-9 place-items-center rounded-[8px] font-semibold text-[#2a0810]"
              style={{ background: 'linear-gradient(160deg,#e3c655,#c9a227)' }}
              aria-hidden
            >
              S
            </span>
            <span>
              <span className="block text-[14px] font-semibold">SCEAI Assistant</span>
              <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-white/45">
                Admin console
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Right: the form. */}
      <div className="flex min-w-0 flex-1 items-center justify-center bg-page px-8 py-12">
        <div className="w-full max-w-[360px]">
          <Eyebrow>Sign in</Eyebrow>
          <h1 className="mt-1 text-[18px] font-semibold text-ink-1">Admin console</h1>
          {mock && (
            <p className="mt-1 text-[12px] text-ink-3">
              Mock mode is on, so any request stays in the browser.
            </p>
          )}

          {sessionEnded && (
            <div
              role="alert"
              className="mt-4 rounded-[8px] border border-maroon-border bg-maroon-tint px-3 py-2 text-[12px] text-maroon"
            >
              {COPY.sessionEnded}
            </div>
          )}

          {disabled && (
            <div
              role="alert"
              className="mt-4 rounded-[8px] border border-gold-border bg-gold-tint px-3 py-2.5"
            >
              <p className="text-[12px] font-semibold text-gold-ink">
                {COPY.apiDisabledTitle}
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">
                {COPY.apiDisabledBody}
              </p>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-5 rounded-[10px] border border-line bg-surface p-4"
          >
            <div className="flex flex-col gap-3">
              <TextInput
                label="Username"
                name="username"
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
              <TextInput
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="mt-3 text-[12px] text-maroon">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || disabled}
              className="mt-4 w-full rounded-[7px] px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(180deg,#8a1538,#6d1029)' }}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>

            {mock && (
              <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
                Demo credentials for mock mode:{' '}
                <span className="font-mono text-[11px] text-ink-2">{MOCK_USERNAME}</span>{' '}
                / <span className="font-mono text-[11px] text-ink-2">{MOCK_PASSWORD}</span>
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
