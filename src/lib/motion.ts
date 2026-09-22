import { useEffect, useState } from 'react'

/**
 * Motion here is restrained on purpose: this is a monitoring console, not a
 * marketing dashboard. Bars grow once on mount, hovered marks lift, and nothing
 * loops or bounces.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (!window.matchMedia) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/**
 * false on the first paint, true immediately after, so a CSS transition has two
 * frames to animate between. Returns true straight away when the reader has
 * asked for reduced motion, so marks render at full size with no transition.
 */
export function useEnterTransition(): { entered: boolean; reduced: boolean } {
  const reduced = usePrefersReducedMotion()
  const [entered, setEntered] = useState(reduced)

  useEffect(() => {
    if (reduced) {
      setEntered(true)
      return
    }
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [reduced])

  return { entered, reduced }
}
