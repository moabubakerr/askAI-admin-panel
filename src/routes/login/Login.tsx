import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/transport'
import { MOCK_PASSWORD, MOCK_USERNAME } from '../../api/mock'
import { useApp } from '../../app/AppContext'
import { COPY } from '../../copy'
import { TextInput } from '../../components/controls'

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
    // One background across the whole page, in the same dark plum gradient the
    // sidebar uses. No split panel.
    <div
      className="hairline-geometry relative flex min-h-full items-center justify-center overflow-hidden px-6 py-12"
      style={{ background: 'linear-gradient(180deg,#2a0810,#170609)' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-10 size-[520px] rotate-[24deg] border border-white/8"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-44 bottom-0 size-[460px] rotate-[18deg] border border-white/6"
      />

      <div className="relative w-full max-w-[380px]">
        {/* Brand above the card. The card header carries "Admin console", so
            the lockup does not repeat it. */}
        <div className="flex items-center gap-3 text-white">
          <span
            className="grid size-9 place-items-center rounded-[8px] font-semibold text-[#2a0810]"
            style={{ background: 'linear-gradient(160deg,#e3c655,#c9a227)' }}
            aria-hidden
          >
            S
          </span>
          <span className="text-[15px] font-semibold">SCEAI Assistant</span>
        </div>

        <div className="mt-7">
          <div className="text-[10px] font-semibold uppercase tracking-[0.09em] text-white/45">
            Sign in
          </div>
          <h1 className="mt-1 text-[18px] font-semibold text-white">Admin console</h1>
          {mock && (
            <p className="mt-1 text-[12px] text-white/55">
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
            className="mt-4 rounded-[10px] border border-black/20 bg-surface p-4 shadow-menu"
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
