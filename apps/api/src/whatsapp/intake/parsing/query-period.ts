import { normalizeText } from './signals'

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const previousMonth = (month: string) => shiftMonth(month, -1)
export function shiftMonth(month: string, offset: number) {
  const date = new Date(`${month}-01T12:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + offset)
  return date.toISOString().slice(0, 7)
}
export function monthLabel(month: string) { return `${MONTHS[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}` }

/** Calendar periods only. Never silently turn a day/week/year request into the current month. */
export function queryPeriod(raw: string, current: string) {
  const text = normalizeText(raw).replace(/setiembre/g, 'septiembre')
  const comparison = /compar|mas (?:o menos|que)|menos que|(?:mas|menos) .*que el mes|respecto (?:al|del) mes/.test(text)
  const iso = [...raw.matchAll(/\b(\d{4}-(?:0[1-9]|1[0-2]))\b/g)].map(match => match[1]!)
  const named = [...text.matchAll(new RegExp(`\\b(${MONTHS.join('|')})(?: (?:de |del )?(20\\d{2}))?\\b`, 'g'))].map(match => {
    const month = MONTHS.indexOf(match[1]!) + 1
    const year = match[2] ? Number(match[2]) : Number(current.slice(0, 4)) - (month > Number(current.slice(5)) ? 1 : 0)
    return `${year}-${String(month).padStart(2, '0')}`
  })
  const explicit = [...new Set([...iso, ...named])]
  const offset = /\bhace (\d{1,2}) meses\b/.exec(text)
  const relative = /mes (pasado|anterior)/.test(text) ? previousMonth(current) : offset ? shiftMonth(current, -Number(offset[1])) : current
  const unsupported = !explicit.length && /\b(ayer|anteayer|anoche|semana|semanas|ano|anos|dias)\b/.test(text)
  const month = explicit[0] ?? relative
  const months = comparison ? explicit.length >= 2 ? explicit.slice(0, 2) : [explicit[0] ?? current, explicit[0] ? previousMonth(explicit[0]) : previousMonth(current)] : [month]
  return { month, months, comparison, unsupported }
}
