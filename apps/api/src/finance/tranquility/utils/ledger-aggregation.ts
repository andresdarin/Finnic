import type { TranquilityCurrency } from '@lovehold/shared'

export type LedgerRow = {
  id: string; movementType: string; amount: unknown; currency: string; date: Date
  title: string; notes: string | null; financeAccountId: string | null; destinationAccountId: string | null
  tranquilityCategoryId: string | null; categoryKey: string | null; tranquilityBucket: string | null
  tranquilityFxSnapshot: unknown; tranquilityOwned: boolean
}

export const cents = (value: unknown): bigint => {
  const text = String(value)
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) throw new Error('Invalid monetary value')
  const negative = text.startsWith('-')
  const clean = negative ? text.slice(1) : text
  const parts = clean.split('.'); const whole = parts[0] ?? '0'; const fraction = parts[1] ?? ''
  const result = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2))
  return negative ? -result : result
}

export const money = (value: bigint): string => {
  if (value > 9_000_000_000_000_000n || value < -9_000_000_000_000_000n) throw new Error('Money exceeds safe cents bound')
  const negative = value < 0n
  const absolute = negative ? -value : value
  return `${negative ? '-' : ''}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`
}

export type FxValue = { toCurrency: TranquilityCurrency; convertedAmount: string }
export function converted(row: LedgerRow, currency: TranquilityCurrency): bigint | null {
  if (row.currency === currency) { try { return cents(row.amount) } catch { return null } }
  const fx = row.tranquilityFxSnapshot
  if (!fx || typeof fx !== 'object' || !('toCurrency' in fx) || !('convertedAmount' in fx)) return null
  const value = fx as FxValue
  if (value.toCurrency !== currency) return null
  try { return cents(value.convertedAmount) } catch { return null }
}

export function monthKey(date: Date): string { return date.toISOString().slice(0, 7) }
export function monthKeyInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(date)
  return `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}`
}
export function monthStart(month: string): Date { return new Date(`${month}-01T00:00:00.000Z`) }
export function nextMonth(month: string): Date { const date = monthStart(month); date.setUTCMonth(date.getUTCMonth() + 1); return date }
export function previousMonth(month: string): string { const date = monthStart(month); date.setUTCMonth(date.getUTCMonth() - 1); return monthKey(date) }
export function historyMonths(month: string): string[] { const date = monthStart(month); const result: string[] = []; for (let i = 11; i >= 0; i--) { const copy = new Date(date); copy.setUTCMonth(date.getUTCMonth() - i); result.push(monthKey(copy)) } return result }
