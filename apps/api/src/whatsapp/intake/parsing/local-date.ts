export const INTAKE_TIME_ZONE = 'America/Montevideo'

export const localDateOf = (instant: Date, timeZone = INTAKE_TIME_ZONE) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant)

export const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

const isRealDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/** Accepts only real calendar dates between one year ago and today (no future purchases). */
export function validPurchaseDate(value: unknown, today: string): string | null {
  if (typeof value !== 'string' || !isRealDate(value)) return null
  if (value > today || value < addDays(today, -366)) return null
  return value
}

/**
 * Montevideo has no DST since 2015 (fixed UTC-3). Noon local keeps the calendar date
 * stable in every monthKey/ISO aggregation, including the last day of a month.
 */
export const purchaseInstant = (date: string) => `${date}T12:00:00-03:00`
