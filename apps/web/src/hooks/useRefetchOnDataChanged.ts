'use client'

import { useEffect, useRef } from 'react'
import { onDataChanged } from '@/lib/dataChanged'

/** Vuelve a pedir los datos cuando otra parte de la app avisa que cambiaron. */
export function useRefetchOnDataChanged(refetch: () => unknown) {
  const latest = useRef(refetch)
  latest.current = refetch
  useEffect(() => onDataChanged(() => { void latest.current() }), [])
}
