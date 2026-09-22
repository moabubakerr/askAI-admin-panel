import { useEffect, useRef, useState } from 'react'
import { DASH, shortDigest } from '../lib/format'

/**
 * A truncated sha256 with a copy action that flips to "copied". Copying a
 * single digest is deliberate — there is no copy-whole-table anywhere.
 */
export function CopyDigest({
  digest,
  length = 12,
  label = 'digest',
}: {
  digest: string | null | undefined
  length?: number
  label?: string
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  if (!digest) return <span className="font-mono text-[11px] text-ink-4">{DASH}</span>

  async function copy() {
    try {
      await navigator.clipboard.writeText(digest!)
      setCopied(true)
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard can be blocked; the truncated digest is still readable.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`${digest}\nClick to copy the full ${label}`}
      className="group inline-flex items-center gap-1.5 rounded-[5px] border border-transparent px-1 py-[1px] font-mono text-[11px] text-ink-3 hover:border-line hover:bg-sunken"
    >
      <span>{shortDigest(digest, length)}</span>
      <span
        className={`text-[10px] ${
          copied ? 'text-ok' : 'text-ink-4 opacity-0 group-hover:opacity-100'
        }`}
      >
        {copied ? 'copied' : 'copy'}
      </span>
    </button>
  )
}
