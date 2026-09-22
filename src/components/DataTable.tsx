import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { formatCount } from '../lib/format'

export interface Column<TRow> {
  key: string
  header: ReactNode
  align?: 'left' | 'right'
  /** A width utility class, e.g. 'w-40'. */
  width?: string
  render: (row: TRow) => ReactNode
}

export type RowTone = 'default' | 'warn' | 'bad' | 'muted'

const ROW_TONES: Record<RowTone, string> = {
  default: 'bg-surface',
  warn: 'bg-warn-bg',
  bad: 'bg-bad-bg',
  muted: 'bg-sunken',
}

export interface PagingProps {
  total: number
  limit: number
  offset: number
  onOffsetChange: (offset: number) => void
}

/**
 * Dense table with full keyboard navigation: ↑ ↓ to move, Enter to open,
 * Escape to go back. Paging is server-side — the footer reports the window the
 * server returned, never a client-side slice.
 */
export function DataTable<TRow>({
  rows,
  columns,
  getRowKey,
  onOpen,
  onEscape,
  rowTone,
  empty,
  paging,
  caption,
}: {
  rows: TRow[]
  columns: Column<TRow>[]
  getRowKey: (row: TRow) => string
  onOpen?: (row: TRow) => void
  onEscape?: () => void
  rowTone?: (row: TRow) => RowTone
  empty: ReactNode
  paging?: PagingProps
  caption: string
}) {
  const [active, setActive] = useState(0)
  const bodyRef = useRef<HTMLTableSectionElement>(null)

  // A new page of rows starts at the top again.
  useEffect(() => setActive(0), [rows])

  const focusRow = useCallback((index: number) => {
    const element = bodyRef.current?.querySelectorAll('tr')[index]
    if (element instanceof HTMLElement) element.focus()
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLTableSectionElement>) {
    if (!rows.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const next = Math.min(active + 1, rows.length - 1)
      setActive(next)
      focusRow(next)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      const next = Math.max(active - 1, 0)
      setActive(next)
      focusRow(next)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActive(0)
      focusRow(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActive(rows.length - 1)
      focusRow(rows.length - 1)
    } else if (event.key === 'Enter' && onOpen) {
      event.preventDefault()
      const row = rows[active]
      if (row) onOpen(row)
    } else if (event.key === 'Escape' && onEscape) {
      event.preventDefault()
      onEscape()
    }
  }

  const from = paging ? paging.offset + 1 : 1
  const to = paging ? paging.offset + rows.length : rows.length
  const canPrev = paging ? paging.offset > 0 : false
  const canNext = paging ? paging.offset + paging.limit < paging.total : false

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line bg-sunken text-left">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-4 ${
                    column.align === 'right' ? 'text-right' : 'text-left'
                  } ${column.width ?? ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody ref={bodyRef} onKeyDown={handleKeyDown}>
            {rows.map((row, index) => {
              const tone = rowTone?.(row) ?? 'default'
              return (
                <tr
                  key={getRowKey(row)}
                  tabIndex={index === active ? 0 : -1}
                  onFocus={() => setActive(index)}
                  onClick={() => onOpen?.(row)}
                  aria-label={onOpen ? 'Press Enter to open' : undefined}
                  className={`border-b border-rowline align-top ${ROW_TONES[tone]} ${
                    onOpen ? 'cursor-pointer' : ''
                  } hover:bg-maroon-tint focus:bg-maroon-tint focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-maroon`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-3 py-2 ${
                        column.align === 'right' ? 'text-right tnum' : 'text-left'
                      }`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && empty}

      {paging && (
        <footer className="flex items-center justify-between gap-4 border-t border-line px-3 py-2 text-[11px] text-ink-3">
          <span className="tnum">
            {paging.total === 0
              ? 'No rows'
              : `Showing ${formatCount(from)}–${formatCount(to)} of ${formatCount(paging.total)}`}
            <span className="ml-2 font-mono text-[10px] text-ink-4">
              limit {paging.limit} · offset {paging.offset}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() =>
                paging.onOffsetChange(Math.max(0, paging.offset - paging.limit))
              }
              className="rounded-[6px] border border-line-strong bg-surface px-2 py-[3px] font-medium text-ink-2 enabled:hover:bg-sunken disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => paging.onOffsetChange(paging.offset + paging.limit)}
              className="rounded-[6px] border border-line-strong bg-surface px-2 py-[3px] font-medium text-ink-2 enabled:hover:bg-sunken disabled:opacity-40"
            >
              Next
            </button>
          </span>
        </footer>
      )}
    </div>
  )
}

/** Hint shown above keyboard-navigable tables. */
export function KeyboardHint({ opens = true }: { opens?: boolean }) {
  return (
    <span className="text-[11px] text-ink-4">
      <kbd className="font-mono">↑</kbd> <kbd className="font-mono">↓</kbd> to move
      {opens && (
        <>
          , <kbd className="font-mono">Enter</kbd> to open
        </>
      )}
      , <kbd className="font-mono">Esc</kbd> to go back
    </span>
  )
}
