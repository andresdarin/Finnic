import type { Currency, PaymentMethod } from '../types'

const USD = /u\$s|us\$|u\$d|\busd\b|d[oó]lar(?:es)?\b|\bverdes?\b|\bdls?\b/i
const UYU = /\$u\b|\buyu\b|\bpesos?\b|\bmangos\b/i

/** Currency explicitly written by the user. "$" alone is not evidence. */
export function currencySignal(text: string): Currency | 'CONFLICT' | null {
  const usd = USD.test(text)
  const uyu = UYU.test(text)
  if (usd && uyu) return 'CONFLICT'
  return usd ? 'USD' : uyu ? 'UYU' : null
}

export function paymentSignal(text: string): PaymentMethod | null {
  const value = text.toLowerCase()
  const debit = /d[eé]bito/.test(value)
  const credit = /cr[eé]dito/.test(value)
  if (debit && credit) return null
  if (debit) return 'DEBIT'
  if (credit) return 'CREDIT'
  if (/\befectivo\b|\bcash\b|\bal contado\b|\bcontado\b/.test(value)) return 'CASH'
  if (/transferencia|transfer[ií]/.test(value)) return 'TRANSFER'
  if (/\btarjeta\b/.test(value)) return 'CARD'
  return null
}

const DATE_WORDS = /\b(hoy|ayer|anteayer|antes de ayer|anoche|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|pasad[oa]|semana)\b|\b\d{1,2}[/-]\d{1,2}\b|\bel\s+\d{1,2}\b/i
export const hasDateSignal = (text: string) => DATE_WORDS.test(text)

export const normalizeText = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9$ ]+/g, ' ').replace(/\s+/g, ' ').trim()
