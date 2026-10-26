import type { TranquilityDashboard } from '@lovehold/shared'

export type RewardAward = { ruleKey: string; periodKey: string; points: number; description: string }

const toCents = (value: string) => {
  const negative = value.startsWith('-')
  const [units = '0', fraction = '00'] = value.replace('-', '').split('.')
  const result = BigInt(units) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2))
  return negative ? -result : result
}

/**
 * Points reward saving habits and reached goals, never spending or logging volume.
 * Each award has a (ruleKey, periodKey) that the database keeps unique.
 */
export function evaluateRewards(input: {
  current: TranquilityDashboard
  previous: TranquilityDashboard | null
  completedGoals: Array<{ id: string; name: string }>
}): RewardAward[] {
  const awards: RewardAward[] = []
  const { current, previous } = input
  const totals = current.summary.totals
  if (totals && toCents(totals.future.target) > 0n && toCents(totals.future.executed) >= toCents(totals.future.target)) {
    awards.push({ ruleKey: 'savings_target_met', periodKey: current.month, points: 100, description: `Apartaste el ahorro planificado de ${current.month}` })
  }
  const planned = current.config ? toCents(current.config.emergencyMonthlyContribution) : 0n
  const contributed = current.pools.emergency.monthContributions
  if (planned > 0n && contributed && toCents(contributed) >= planned) {
    awards.push({ ruleKey: 'emergency_contribution', periodKey: current.month, points: 50, description: `Aportaste al fondo de emergencia en ${current.month}` })
  }
  // Only a closed month can prove "within budget"; the current month could still overspend.
  const closed = previous?.summary.totals
  if (previous && closed && closed.wants.target !== '0.00' && toCents(closed.wants.executed) <= toCents(closed.wants.target)) {
    awards.push({ ruleKey: 'wants_within_budget', periodKey: previous.month, points: 50, description: `Cerraste ${previous.month} dentro de tu presupuesto de gustos` })
  }
  if (current.goalMetrics?.emergency.funded && toCents(current.goalMetrics.emergency.target) > 0n) {
    awards.push({ ruleKey: 'emergency_funded', periodKey: 'once', points: 300, description: 'Completaste tu fondo de emergencia' })
  }
  for (const goal of input.completedGoals) {
    awards.push({ ruleKey: 'goal_completed', periodKey: goal.id, points: 200, description: `Alcanzaste la meta "${goal.name}"` })
  }
  return awards
}
