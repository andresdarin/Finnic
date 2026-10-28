import type { DefaultQueryPeriod } from '@lovehold/shared'
import { normalizeText } from './signals'

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const previousMonth = (month: string) => shiftMonth(month, -1)
export function shiftMonth(month: string, offset: number) {
  const date = new Date(`${month}-01T12:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + offset)
  return date.toISOString().slice(0, 7)
}
export function monthLabel(month: string) { return `${MONTHS[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}` }

type Range = { from: string | null; to: string; label: string; month: string }
const addDays = (day: string, amount: number) => { const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10) }
const monthRange = (month: string): Range => ({ from: `${month}-01`, to: `${shiftMonth(month, 1)}-01`, label: monthLabel(month), month })
const yearRange = (year: number): Range => ({ from: `${year}-01-01`, to: `${year + 1}-01-01`, label: String(year), month: `${year}-01` })
const dayMonth = (day: string) => Number(day.slice(8, 10))
const monthOf = (day: string) => day.slice(0, 7)

function currentRange(kind: DefaultQueryPeriod, today: string): Range {
  const month = monthOf(today), year = Number(today.slice(0, 4)), day = dayMonth(today)
  if (kind === 'WEEK') {
    const weekday = new Date(`${today}T12:00:00Z`).getUTCDay()
    const from = addDays(today, -(weekday + 6) % 7)
    return { from, to: addDays(today, 1), label: `la semana del ${from}`, month }
  }
  if (kind === 'FORTNIGHT') {
    const from = `${month}-${day <= 15 ? '01' : '16'}`
    return { from, to: addDays(today, 1), label: `la quincena desde el ${from.slice(8)} de ${monthLabel(month)}`, month }
  }
  if (kind === 'YEAR') return { ...yearRange(year), to: addDays(today, 1), label: `lo que va de ${year}` }
  if (kind === 'ALL_TIME') return { from: null, to: addDays(today, 1), label: 'todo el historial', month }
  return { ...monthRange(month), to: addDays(today, 1), label: `lo que va de ${monthLabel(month)}` }
}

function previousRange(kind: DefaultQueryPeriod, today: string): Range {
  if (kind === 'MONTH') return monthRange(previousMonth(monthOf(today)))
  if (kind === 'YEAR') return yearRange(Number(today.slice(0, 4)) - 1)
  if (kind === 'WEEK') { const current = currentRange('WEEK', today); const from = addDays(current.from!, -7); return { from, to: current.from!, label: `la semana del ${from}`, month: monthOf(from) } }
  if (kind === 'FORTNIGHT') {
    const current = currentRange('FORTNIGHT', today)
    const end = current.from!
    const from = dayMonth(end) === 1 ? `${previousMonth(monthOf(today))}-16` : `${monthOf(today)}-01`
    return { from, to: end, label: `la quincena desde el ${from.slice(8)} de ${monthLabel(monthOf(from))}`, month: monthOf(from) }
  }
  return currentRange('ALL_TIME', today)
}

/** Resolves an explicit calendar period first; otherwise uses the profile preference. */
export function queryPeriod(raw: string, current: string, preference: DefaultQueryPeriod = 'MONTH', today = `${current}-15`) {
  const text = normalizeText(raw).replace(/setiembre/g, 'septiembre')
  const comparison = /compar|mas (?:o menos|que)|menos que|respecto/.test(text)
  const iso = [...raw.matchAll(/\b(\d{4}-(?:0[1-9]|1[0-2]))\b/g)].map(match => match[1]!)
  const named = [...text.matchAll(new RegExp(`\\b(${MONTHS.join('|')})(?: (?:de |del )?(20\\d{2}))?\\b`, 'g'))].map(match => {
    const month = MONTHS.indexOf(match[1]!) + 1
    const year = match[2] ? Number(match[2]) : Number(current.slice(0, 4)) - (month > Number(current.slice(5)) ? 1 : 0)
    return `${year}-${String(month).padStart(2, '0')}`
  })
  const explicit = [...new Set([...iso, ...named])]
  const ago = /\bhace (\d{1,2}) meses\b/.exec(text)
  const previousMonthAsked = /mes (?:pasado|anterior)/.test(text)
  const currentMonthAsked = /(?:este|actual|corriente) mes|mes actual|\b(?:del|en el|durante el) mes\b/.test(text)
  const explicitYear = /\b(?:en |durante )?(20\d{2})\b/.exec(text)
  let kind: DefaultQueryPeriod = explicit.length && /quincena/.test(text) ? 'FORTNIGHT'
    : explicit.length || previousMonthAsked || currentMonthAsked || ago ? 'MONTH'
    : /quincena/.test(text) ? 'FORTNIGHT' : /semana/.test(text) ? 'WEEK'
      : /\bano\b/.test(text) || explicitYear ? 'YEAR'
        : /\b(total|historico|historial|siempre|desde que empece)\b/.test(text) ? 'ALL_TIME' : preference
  let range: Range
  if (explicit.length && kind === 'FORTNIGHT') {
    const selectedMonth = explicit[0]!
    const from = `${selectedMonth}-${/segunda quincena/.test(text) ? '16' : '01'}`
    const to = /segunda quincena/.test(text) ? `${shiftMonth(selectedMonth, 1)}-01` : `${selectedMonth}-16`
    range = { from, to, month: selectedMonth, label: `${/segunda quincena/.test(text) ? 'segunda' : 'primera'} quincena de ${monthLabel(selectedMonth)}` }
  }
  else if (explicit.length) range = monthRange(explicit[0]!)
  else if (previousMonthAsked) range = monthRange(previousMonth(current))
  else if (ago) range = monthRange(shiftMonth(current, -Number(ago[1])))
  else if (kind === 'YEAR' && explicitYear) range = yearRange(Number(explicitYear[1]))
  else if (kind === 'YEAR' && /ano (?:pasado|anterior)/.test(text)) range = yearRange(Number(today.slice(0, 4)) - 1)
  else if (kind === 'WEEK' && /semana (?:pasada|anterior)/.test(text)) range = previousRange(kind, today)
  else if (kind === 'FORTNIGHT' && /quincena (?:pasada|anterior)/.test(text)) range = previousRange(kind, today)
  else range = currentRange(kind, today)

  const unsupported = (!explicit.length && /\b(ayer|anteayer|anoche|dias|ultimos \d+ dias|ultimas? (?:\d+|dos|tres) semanas)\b/.test(text))
    || (explicit.length > 0 && /quincena/.test(text) && !/primera|segunda/.test(text))
  let ranges = [range]
  if (comparison) {
    if (explicit.length >= 2) ranges = explicit.slice(0, 2).map(monthRange)
    else if (explicit.length || previousMonthAsked || ago) ranges = [monthRange(current), range]
    else ranges = [currentRange(kind, today), previousRange(kind, today)]
  }
  const month = range.month
  const months = comparison && ranges.length === 2 ? ranges.map(value => value.month) : [month]
  return { month, months, comparison, unsupported, period: kind, from: range.from, to: range.to, label: range.label, ranges }
}
