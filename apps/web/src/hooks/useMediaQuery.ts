'use client'

import { useCallback, useSyncExternalStore } from 'react'

/** Breakpoints de Tailwind usados por el shell desktop. */
export const DESKTOP_QUERY = '(min-width: 1024px)'
export const WIDE_DESKTOP_QUERY = '(min-width: 1280px)'

/** En el servidor devuelve false: todo arranca como móvil y se corrige al hidratar. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const media = window.matchMedia(query)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)
}
