'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * Carrusel automático: avanza cada `intervalMs`, se pausa con hover
 * y se detiene si el usuario prefiere menos movimiento.
 * Elegir un slide a mano reinicia el temporizador.
 */
export function useAutoSlide(count: number, intervalMs: number) {
  const reduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || reduceMotion || count < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs)
    return () => clearInterval(id)
  }, [paused, reduceMotion, count, intervalMs, index])

  return {
    index,
    select: setIndex,
    pause: () => setPaused(true),
    resume: () => setPaused(false),
  }
}
