/**
 * Deterministic GUID-shaped ids for the fixtures. Same seed, same id on every
 * reload, so links and citations stay stable — but obviously synthetic.
 */
function hash(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return (h >>> 0) / 4294967296
  }
}

function hex(next: () => number, length: number): string {
  let out = ''
  while (out.length < length) {
    out += Math.floor(next() * 16).toString(16)
  }
  return out.slice(0, length)
}

export function guid(seed: string): string {
  const next = hash(seed)
  return [hex(next, 8), hex(next, 4), `4${hex(next, 3)}`, `8${hex(next, 3)}`, hex(next, 12)].join(
    '-',
  )
}

/** A 64-character lowercase hex digest, shaped like a real sha256. */
export function sha256(seed: string): string {
  const next = hash(seed)
  return hex(next, 64)
}

/** Deterministic number in [min, max]. */
export function pick(seed: string, min: number, max: number): number {
  return min + Math.floor(hash(seed)() * (max - min + 1))
}
