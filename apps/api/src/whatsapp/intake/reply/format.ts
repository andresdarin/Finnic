import type { Currency, PaymentMethod } from '../types'

/** "$U 1.250,50" / "US$ 20,00" from a decimal string, never through floating point. */
export function formatMoney(amount: string, currency: Currency | string) {
  const negative = amount.startsWith('-')
  const [units = '0', cents = '00'] = amount.replace('-', '').split('.')
  const grouped = units.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${negative ? '-' : ''}${currency === 'USD' ? 'US$' : '$U'} ${grouped},${cents.padEnd(2, '0').slice(0, 2)}`
}

export const formatDate = (date: string) => {
  const [year, month, day] = date.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  DEBIT: 'débito', CREDIT: 'crédito', CASH: 'efectivo', TRANSFER: 'transferencia', CARD: 'tarjeta',
}

export const CURRENCY_LABELS: Record<Currency, string> = { UYU: 'pesos (UYU)', USD: 'dólares (USD)' }

export const optionList = (options: string[]) => options.map((option, index) => `${index + 1}) ${option}`).join('\n')
