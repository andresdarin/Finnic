'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Ancho real de un elemento (0 hasta la primera medición). A diferencia de una media query,
 * tiene en cuenta lo que ocupan la sidebar y el panel de Finnic.
 */
export function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => { if (entry) setWidth(entry.contentRect.width) })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, width] as const
}
