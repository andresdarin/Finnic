import { validPurchaseDate } from './local-date'

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** Separates a calendar date from monetary values; invalid explicit dates remain unresolved. */
export function explicitDate(text: string, today: string): { date: string | null; remaining: string } | null {
  const named = new RegExp(`\\b(\\d{1,2})\\s+de\\s+(${MONTHS.join('|')})(?:\\s+de\\s+(\\d{4}))?\\b`, 'i').exec(text)
  const numeric = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/.exec(text)
  const match = named ?? numeric
  if (!match) return null
  const month = named ? MONTHS.indexOf(match[2]!.toLowerCase()) + 1 : Number(match[2])
  const year = match[3] ?? today.slice(0, 4)
  const suffix = `-${String(month).padStart(2, '0')}-${match[1]!.padStart(2, '0')}`
  const date = validPurchaseDate(`${year}${suffix}`, today) ?? (!match[3] ? validPurchaseDate(`${Number(year) - 1}${suffix}`, today) : null)
  return { date, remaining: text.replace(match[0], ' ') }
}
