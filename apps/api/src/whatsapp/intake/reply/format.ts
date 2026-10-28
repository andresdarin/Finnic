import type { Currency, PaymentMethod } from '../types'

/** "$U 1.250,50" / "US$ 20,00" from a decimal string, never through floating point. */
export function formatMoney(amount: string, currency: Currency | string) {
  const negative = amount.startsWith('-')
  const [units = '0', cents = '00'] = amount.replace('-', '').split('.')
  const grouped = units.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${negative ? '-' : ''}${currency === 'USD' ? 'US$' : '$U'} ${grouped},${cents.padEnd(2, '0').slice(0, 2)}`
}

export const formatDate = (date: string, now = new Date(), relative = true) => {
  const day = date.slice(0, 10)
  const instant = new Date(`${day}T12:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(instant.getTime())) return 'fecha sin confirmar'
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const distance = (Date.parse(`${today}T12:00:00Z`) - instant.getTime()) / 86_400_000
  const prefix = relative && distance === 0 ? 'hoy, ' : relative && distance === 1 ? 'ayer, ' : ''
  return prefix + new Intl.DateTimeFormat('es-UY', { timeZone: 'UTC', day: 'numeric', month: 'long', ...(day.slice(0, 4) !== today.slice(0, 4) ? { year: 'numeric' } : {}) }).format(instant)
}

/** Presentation only: preserve the original OCR names in the saved receipt. */
export const receiptLabel = (text: string) => {
  const clean = text.trim().replace(/\s+/g, ' ')
  return clean === clean.toLocaleUpperCase('es-UY') ? clean.charAt(0).toLocaleUpperCase('es-UY') + clean.slice(1).toLocaleLowerCase('es-UY') : clean
}

export const compactMoney = (amount: string, currency: string) => formatMoney(amount, currency).replace(/,00$/, '')

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  DEBIT: 'débito', CREDIT: 'crédito', CASH: 'efectivo', TRANSFER: 'transferencia', CARD: 'tarjeta',
}

export const CURRENCY_LABELS: Record<Currency, string> = { UYU: 'pesos (UYU)', USD: 'dólares (USD)' }

export const optionList = (options: string[]) => options.map((option, index) => `${index + 1}) ${option}`).join('\n')
