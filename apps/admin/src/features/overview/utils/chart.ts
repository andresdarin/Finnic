/** Tope "lindo" del eje Y (1, 2, 5 × 10^n) y sus marcas, para que la grilla no muestre decimales raros. */
export function niceScale(max: number, ticks = 3): { top: number; steps: number[] } {
  if (max <= 0) return { top: ticks, steps: Array.from({ length: ticks + 1 }, (_, i) => i) }
  const raw = max / ticks
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((f) => f * magnitude).find((s) => s >= raw)!
  const stepInt = Math.max(1, Math.ceil(step))
  const top = stepInt * Math.ceil(max / stepInt)
  return { top, steps: Array.from({ length: Math.round(top / stepInt) + 1 }, (_, i) => i * stepInt) }
}
