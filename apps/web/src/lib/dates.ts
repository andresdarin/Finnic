/**
 * Fechas de calendario (día de un gasto, sin hora). La API las guarda como
 * `AAAA-MM-DD` o medianoche UTC; leerlas con `new Date()` las corre al día
 * anterior en Uruguay (UTC-3). Estas utilidades las tratan siempre en hora local.
 */
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z)?$/

/** Interpreta una fecha de calendario como ese día en hora local. */
export function parseCalendarDate(value: string): Date {
  const match = CALENDAR_DATE.exec(value)
  if (!match) return new Date(value)
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/** Hoy en hora local, como `AAAA-MM-DD` (para inputs de fecha). */
export function todayLocalISO(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
