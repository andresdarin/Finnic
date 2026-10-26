const toCents = (value: string) => {
  const [units = '0', fraction = '00'] = value.split('.')
  return BigInt(units) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2))
}
const toMoney = (cents: bigint) => `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`

/** Whole months left to contribute, counting the current month; at least 1 while the date is ahead. */
export function monthsRemaining(today: string, targetDate: string) {
  if (targetDate < today) return 0
  const [ty, tm] = today.split('-').map(Number)
  const [gy, gm] = targetDate.split('-').map(Number)
  return Math.max(1, (gy! - ty!) * 12 + (gm! - tm!) + 1)
}

/**
 * Monthly contribution needed to reach the goal on time, rounded up to the cent so it is never
 * understated. Null when already funded. A past-due goal needs the full shortfall now.
 */
export function requiredMonthlyContribution(target: string, allocated: string, targetDate: string, today: string): string | null {
  const shortfall = toCents(target) - toCents(allocated)
  if (shortfall <= 0n) return null
  const months = BigInt(monthsRemaining(today, targetDate) || 1)
  return toMoney((shortfall + months - 1n) / months)
}

export const goalShortfall = (target: string, allocated: string) => {
  const gap = toCents(target) - toCents(allocated)
  return toMoney(gap > 0n ? gap : 0n)
}
