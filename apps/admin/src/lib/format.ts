const LOCALE = 'es-UY'
const TZ = 'America/Montevideo'

export const formatNumber = (value: number) => new Intl.NumberFormat(LOCALE).format(value)

export const formatPercent = (part: number, total: number) =>
  total === 0 ? '0%' : new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 1 }).format(part / total)

export function formatDate(iso: string | null, withTime = false): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(iso))
}

/** "hace 3 días" a partir de un ISO; `null` → "Nunca / sin dato". */
export function formatRelative(iso: string | null, now = Date.now()): string {
  if (!iso) return 'Sin dato'
  const diff = (new Date(iso).getTime() - now) / 1000
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [['day', 86_400], ['hour', 3_600], ['minute', 60]]
  for (const [unit, seconds] of units) {
    if (Math.abs(diff) >= seconds) return rtf.format(Math.round(diff / seconds), unit)
  }
  return 'recién'
}

/** Día YYYY-MM-DD (UTC) → "27 oct". */
export const formatDay = (day: string) =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${day}T00:00:00Z`))
