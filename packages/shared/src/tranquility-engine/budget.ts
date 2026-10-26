import type { TranquilityConfig, TranquilityMoney } from '../schemas/tranquility'
import { formatTranquilityCents, parseTranquilityCents } from './money'

export type BudgetAllocation = { needs: TranquilityMoney; wants: TranquilityMoney; future: TranquilityMoney }
export const allocateBudget = (income: TranquilityMoney, needsBps: number, wantsBps: number, futureBps: number): BudgetAllocation => {
  if (![needsBps, wantsBps, futureBps].every(Number.isInteger) || needsBps < 0 || wantsBps < 0 || futureBps < 0 || needsBps + wantsBps + futureBps !== 10000) throw new Error('Budget percentages must be integer bps summing to 10000')
  const cents = parseTranquilityCents(income); if (cents < 0n) throw new Error('Income cannot be negative')
  const weights = [needsBps, wantsBps, futureBps]; const raw = weights.map(w => cents * BigInt(w)); const floors = raw.map(v => v / 10000n)
  let remaining = cents - floors.reduce((a, b) => a + b, 0n)
  const order = raw.map((v, i) => ({ i, remainder: v % 10000n })).sort((a, b) => b.remainder > a.remainder ? 1 : b.remainder < a.remainder ? -1 : a.i - b.i)
  for (const item of order) { if (remaining === 0n) break; floors[item.i] = (floors[item.i] ?? 0n) + 1n; remaining-- }
  return { needs: formatTranquilityCents(floors[0] ?? 0n), wants: formatTranquilityCents(floors[1] ?? 0n), future: formatTranquilityCents(floors[2] ?? 0n) }
}
export const allocateConfigBudget = (config: TranquilityConfig) => allocateBudget(config.netMonthlyIncome, config.needsBps, config.wantsBps, config.futureBps)
