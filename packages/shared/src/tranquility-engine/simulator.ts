import type { TranquilityMoney } from '../schemas/tranquility'
import { parseTranquilityCents, formatTranquilityCents } from './money'

export type SimulatorInput = { initialCapital: TranquilityMoney; monthlyContribution: TranquilityMoney; annualReturnPct: number; annualInflationPct: number; years: number; contributionGrowthPct: number; targetCapital: TranquilityMoney }
export type SimulationPoint = { year: number; contributed: TranquilityMoney; growth: TranquilityMoney; total: TranquilityMoney; realTotal: TranquilityMoney; target: TranquilityMoney }
export type SimulationResult = { points: SimulationPoint[]; yearsToGoal: number | null }
const valid = (n: number) => Number.isFinite(n) && n > -100 && n <= 100000
export const simulateGrowth = (input: SimulatorInput): SimulationResult => {
  if (![input.annualReturnPct, input.annualInflationPct, input.contributionGrowthPct].every(valid) || input.annualReturnPct <= -100 || input.annualInflationPct <= -100 || !Number.isInteger(input.years) || input.years < 0 || input.years > 100) throw new Error('Invalid bounded simulation input')
  let total = Number(parseTranquilityCents(input.initialCapital)); let contributed = total; let monthly = Number(parseTranquilityCents(input.monthlyContribution)); const target = Number(parseTranquilityCents(input.targetCapital)); const points: SimulationPoint[] = []
  const monthlyRate = Math.pow(1 + input.annualReturnPct / 100, 1 / 12) - 1
  for (let year = 0; year <= input.years; year++) {
    if (year > 0) { for (let month = 0; month < 12; month++) { total *= 1 + monthlyRate; total += monthly; contributed += monthly }; monthly *= 1 + input.contributionGrowthPct / 100 }
    const real = total / Math.pow(1 + input.annualInflationPct / 100, year)
    if (![total, contributed, real].every(Number.isFinite) || [total, contributed, real].some(value => Math.abs(value) > 9_000_000_000_000_000)) throw new Error('Simulation overflow')
    points.push({ year, contributed: formatTranquilityCents(BigInt(Math.round(contributed))), growth: formatTranquilityCents(BigInt(Math.round(total - contributed))), total: formatTranquilityCents(BigInt(Math.round(total))), realTotal: formatTranquilityCents(BigInt(Math.round(real))), target: input.targetCapital })
  }
  const reached = points.find(p => parseTranquilityCents(p.realTotal) >= BigInt(target)); return { points, yearsToGoal: reached?.year ?? null }
}
export const simulateScenarios = (input: Omit<SimulatorInput, 'annualReturnPct'>, assumptions = { conservative: 3, base: 6, optimistic: 9 }) => Object.fromEntries(Object.entries(assumptions).map(([name, annualReturnPct]) => [name, simulateGrowth({ ...input, annualReturnPct })])) as Record<string, SimulationResult>
