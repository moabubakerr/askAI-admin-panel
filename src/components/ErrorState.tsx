import { ApiError } from '../api/transport'
import { useApp } from '../app/AppContext'
import { COPY } from '../copy'

/**
 * A failed call says what failed. In live mode it always offers the way back to
 * mock data, so a dead backend never leaves a blank screen.
 */
export function ErrorState({
  what,
  error,
  onRetry,
}: {
  what: string
  error: unknown
  onRetry?: () => void
}) {
  const { mock, setMock } = useApp()
  const apiError = error instanceof ApiError ? error : null
  const message =
    apiError?.message ?? (error instanceof Error ? error.message : 'Something went wrong.')

  const disabled = apiError?.kind === 'api-disabled'
  const notFound = apiError?.kind === 'not-found'
  const retryable = !disabled && !notFound

  return (
    <div className="m-5 max-w-3xl rounded-[10px] border border-maroon-border bg-maroon-tint p-4">
      <p className="text-[13px] font-semibold text-maroon">
        {mock ? `Could not load ${what}.` : `${COPY.liveCallFailed} Could not load ${what}.`}
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">{message}</p>
      {disabled && (
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">
          {COPY.apiDisabledBody}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2">
        {onRetry && retryable && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-[6px] border border-line-strong bg-surface px-2.5 py-1 text-[12px] font-medium text-ink-2 hover:bg-sunken"
          >
            Try again
          </button>
        )}
        {!mock && (
          <button
            type="button"
            onClick={() => setMock(true)}
            className="rounded-[6px] border border-maroon bg-maroon px-2.5 py-1 text-[12px] font-medium text-white hover:bg-maroon-hover"
          >
            {COPY.returnToMock}
          </button>
        )}
      </div>
    </div>
  )
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-2 px-5 py-9 text-[12px] text-ink-3">
      <span className="size-3.5 animate-spin rounded-full border-2 border-line-strong border-t-maroon" />
      Loading {label}…
    </div>
  )
}
