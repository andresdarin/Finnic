import type { AdminDailyCount } from '@lovehold/shared'

const DAY_MS = 86_400_000

export const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS)

/** Completa con ceros los días sin altas para que el gráfico tenga un punto por día (UTC). */
export function fillDailySeries(rows: AdminDailyCount[], now: Date, days: number): AdminDailyCount[] {
  const byDate = new Map(rows.map((row) => [row.date, row.count]))
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end - (days - 1 - index) * DAY_MS).toISOString().slice(0, 10)
    return { date, count: byDate.get(date) ?? 0 }
  })
}
