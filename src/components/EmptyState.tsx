import type { ReactNode } from 'react'

/**
 * Several endpoints legitimately return nothing. The copy must say which case
 * it is — "no rows yet" and "no rows match your filters" are different facts.
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-[13px] font-medium text-ink-2">{title}</p>
      {body && (
        <p className="mx-auto mt-1.5 max-w-lg text-[12px] leading-relaxed text-ink-3">
          {body}
        </p>
      )}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  )
}
