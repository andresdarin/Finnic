import type { GoalMetrics, TranquilityConfig, TranquilityMoney } from '../schemas/tranquility'
import { parseTranquilityCents, formatTranquilityCents } from './money'
import { simulateGrowth } from './simulator'

const scaled = (value: number, scale: number) => {
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value * scale)) {
    throw new Error('Invalid goal assumption')
  }
  return BigInt(Math.round(value * scale))
}

const shortfall = (target: bigint, current: bigint) =>
  formatTranquilityCents(target > current ? target - current : 0n)

export const emergencyMetrics = (
  essentialExpenses: TranquilityMoney,
  current: TranquilityMoney,
  months = 6,
) => {
  if (!Number.isInteger(months) || months < 0 || months > 120) throw new Error('Invalid emergency months')
  const expense = parseTranquilityCents(essentialExpenses)
  const value = parseTranquilityCents(current)
  const target = expense * BigInt(months)
  return {
    target: formatTranquilityCents(target), current,
    shortfall: shortfall(target, value),
    monthsCovered: expense > 0n ? Number(value) / Number(expense) : null,
    funded: value >= target,
  }
}

/** FI capital is annual spending divided by the withdrawal rate. Multiplier is not involved. */
export const fiTarget = (
  futureMonthlyExpense: TranquilityMoney,
  withdrawalRatePct: number,
  _legacyMultiplier?: number,
): TranquilityMoney => {
  const rate = scaled(withdrawalRatePct, 100)
  if (rate <= 0n || rate > 10000n) throw new Error('Invalid withdrawal rate')
  // Money is stored in cents while the rate basis is hundredths of a percent.
  const numerator = parseTranquilityCents(futureMonthlyExpense) * 120000n
  return formatTranquilityCents((numerator + rate - 1n) / rate)
}

export const multiplierForWithdrawalRate = (withdrawalRatePct: number) => {
  if (!Number.isFinite(withdrawalRatePct) || withdrawalRatePct <= 0) throw new Error('Invalid withdrawal rate')
  return 100 / withdrawalRatePct
}
export const calculateFiTarget = fiTarget

const progress = (target: bigint, current: bigint) =>
  target > 0n ? Math.min(100, Number(current * 10000n / target) / 100) : 100

export const buildGoalMetrics = ({
  config, emergencyBalance, investmentBalance,
}: {
  config: TranquilityConfig
  emergencyBalance: string
  investmentBalance: string
}): GoalMetrics => {
  const emergency = parseTranquilityCents(emergencyBalance)
  const investment = parseTranquilityCents(investmentBalance)
  if (emergency < 0n || investment < 0n) throw new Error('Balances must be nonnegative')

  const essential = parseTranquilityCents(config.essentialExpenses)
  const monthlyContribution = parseTranquilityCents(config.monthlyContribution)
  const emergencyContribution = parseTranquilityCents(config.emergencyMonthlyContribution)
  const futureExpense = parseTranquilityCents(config.futureMonthlyExpense)
  if (essential < 0n || monthlyContribution < 0n || emergencyContribution < 0n || futureExpense < 0n) {
    throw new Error('Goal expenses and contributions must be nonnegative')
  }
  const emergencyTarget = essential * BigInt(config.emergencyMonths)
  const emergencyGap = emergencyTarget > emergency ? emergencyTarget - emergency : 0n
  const planned = emergencyContribution
  const accumulationTarget = monthlyContribution * scaled(config.multiplier, 100)
  const accumulationTargetCents = accumulationTarget / 100n
  const accumulationGap = accumulationTargetCents > investment ? accumulationTargetCents - investment : 0n
  const fi = fiTarget(config.futureMonthlyExpense, config.withdrawalRatePct)
  const fiTargetCents = parseTranquilityCents(fi)
  const withdrawal = investment * scaled(config.withdrawalRatePct, 100) / 120000n
  let yearsToGoal: number | null = null
  try {
    yearsToGoal = simulateGrowthForGoal(config, investmentBalance, fi).yearsToGoal
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('overflow')) throw error
  }
  return {
    emergency: {
      target: formatTranquilityCents(emergencyTarget), current: emergencyBalance,
      shortfall: formatTranquilityCents(emergencyGap), funded: emergency >= emergencyTarget,
      monthsCovered: essential > 0n ? Number(emergency) / Number(essential) : null,
      monthsToGoal: emergencyGap === 0n ? 0 : planned > 0n ? Number((emergencyGap + planned - 1n) / planned) : null,
      progressPct: progress(emergencyTarget, emergency),
    },
    accumulation: {
      target: formatTranquilityCents(accumulationTargetCents), current: investmentBalance,
      shortfall: formatTranquilityCents(accumulationGap), progressPct: progress(accumulationTargetCents, investment),
      multiplier: config.multiplier,
    },
    financialIndependence: {
      target: fi, current: investmentBalance, shortfall: shortfall(fiTargetCents, investment),
      progressPct: progress(fiTargetCents, investment), withdrawalRatePct: config.withdrawalRatePct,
      estimatedMonthlyWithdrawal: formatTranquilityCents(withdrawal), yearsToGoal,
    },
  }
}

const simulateGrowthForGoal = (config: TranquilityConfig, initialCapital: string, target: TranquilityMoney) => {
  // Kept local to avoid making the public helper's projection assumptions implicit.
  const monthlyRate = config.annualReturnPct
  return simulateGrowth({ initialCapital, monthlyContribution: config.monthlyContribution,
    annualReturnPct: monthlyRate, annualInflationPct: config.annualInflationPct,
    years: 100, contributionGrowthPct: 0, targetCapital: target })
}

export const fiMetrics = (essentialExpenses: TranquilityMoney, current: TranquilityMoney, withdrawalRatePct: number) => {
  const target = fiTarget(essentialExpenses, withdrawalRatePct)
  const targetCents = parseTranquilityCents(target); const currentCents = parseTranquilityCents(current)
  return { target, current, shortfall: shortfall(targetCents, currentCents), progressPct: progress(targetCents, currentCents) }
}
