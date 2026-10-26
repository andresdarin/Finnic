import type { TranquilityCurrency, TranquilityMoney } from '../schemas/tranquility'

const MONEY = /^-?(0|[1-9]\d*)\.\d{2}$/
const MAX_CENTS = 9_000_000_000_000_000n
export const parseTranquilityCents = (value: string): bigint => {
  if (!MONEY.test(value) || value === '-0.00') throw new Error('Money must have exactly two decimals and no negative zero')
  const negative = value[0] === '-'; const raw = negative ? value.slice(1) : value
  const [units = '0', cents = '00'] = raw.split('.')
  const result = BigInt(units) * 100n + BigInt(cents)
  if (result > MAX_CENTS) throw new Error('Money exceeds safe cents bound')
  return negative ? -result : result
}
export const formatTranquilityCents = (cents: bigint): string => {
  if (cents > MAX_CENTS || cents < -MAX_CENTS) throw new Error('Money exceeds safe cents bound')
  const negative = cents < 0n; const absolute = negative ? -cents : cents
  return `${negative ? '-' : ''}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`
}
export const centsMoney = (currency: TranquilityCurrency, cents: bigint) => ({ currency, amount: formatTranquilityCents(cents) })
export const convertCurrency = (amount: TranquilityMoney, rate: string): TranquilityMoney => {
  const source = parseTranquilityCents(amount); if (!/^(0|[1-9]\d*)(\.\d{1,8})?$/.test(rate)) throw new Error('Invalid FX rate')
  const [whole = '0', fraction = ''] = rate.split('.'); if (Number(rate) <= 0 || Number(rate) > 1_000_000) throw new Error('FX rate is outside bounds'); const scale = 10n ** BigInt(fraction.length)
  const numerator = source * (BigInt(whole) * scale + BigInt(fraction || '0'))
  const sign = numerator < 0n ? -1n : 1n; const abs = numerator < 0n ? -numerator : numerator
  return formatTranquilityCents(sign * ((abs + scale / 2n) / scale))
}
export const MAX_SAFE_TRANQUILITY_CENTS = MAX_CENTS
export const parseMoneyToCents = parseTranquilityCents
export const formatCents = formatTranquilityCents
export const parseDecimalToCents = parseTranquilityCents
