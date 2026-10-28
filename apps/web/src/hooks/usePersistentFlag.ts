'use client'

import { useCallback, useState } from 'react'

function read(key: string, fallback: boolean): boolean {
  try {
    const value = window.localStorage.getItem(key)
    return value === null ? fallback : value === 'true'
  } catch {
    return fallback
  }
}

/**
 * Booleano recordado en localStorage. Si el almacenamiento no está disponible
 * (modo privado, bloqueado) funciona igual, solo que sin recordar.
 */
export function usePersistentFlag(key: string, fallback: boolean) {
  const [value, setValue] = useState(() => (typeof window === 'undefined' ? fallback : read(key, fallback)))

  const set = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      try { window.localStorage.setItem(key, String(resolved)) } catch { /* sin persistencia */ }
      return resolved
    })
  }, [key])

  return [value, set] as const
}
