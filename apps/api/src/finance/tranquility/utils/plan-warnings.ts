import { cents, money } from './ledger-aggregation'

type Warning = { code: string; message: string }
type Totals = { actualIncome: string; totalExpenses: string } | null
type PlanInput = {
  essentialExpenses: string; monthlyContribution: string; emergencyMonthlyContribution: string
  needsTarget: string | null; futureTarget: string | null
  goalsRequiredMonthly: string[]
  allocated: string; investmentBalance: string | null
  totals: Totals
  format: (value: string) => string
}

/** Flags a plan that does not close with the available income. Pure arithmetic in cents. */
export function planWarnings(input: PlanInput): Warning[] {
  const warnings: Warning[] = []
  const f = input.format
  if (input.needsTarget !== null && cents(input.essentialExpenses) > cents(input.needsTarget)) {
    warnings.push({ code: 'PLAN_DEFICIT', message: `Tus gastos esenciales declarados (${f(input.essentialExpenses)}) superan lo asignado a gastos esenciales (${f(input.needsTarget)}). El plan no cierra: ajustá los porcentajes o los gastos.` })
  }
  const contributions = cents(input.monthlyContribution) + cents(input.emergencyMonthlyContribution)
  if (input.futureTarget !== null && contributions > cents(input.futureTarget)) {
    warnings.push({ code: 'PLAN_DEFICIT', message: `Los aportes planificados (${f(money(contributions))} entre inversión y emergencia) superan lo asignado a GUARDAR (${f(input.futureTarget)}).` })
  }
  const goals = input.goalsRequiredMonthly.reduce((sum, value) => sum + cents(value), 0n)
  if (input.futureTarget !== null && goals > 0n && goals > cents(input.futureTarget)) {
    warnings.push({ code: 'PLAN_DEFICIT', message: `Tus metas LLEGAR necesitan ${f(money(goals))} por mes para cumplirse a tiempo, más que lo asignado a GUARDAR (${f(input.futureTarget)}).` })
  }
  if (input.investmentBalance !== null && cents(input.allocated) > cents(input.investmentBalance)) {
    warnings.push({ code: 'GOAL_OVERALLOCATED', message: `Asignaste ${f(input.allocated)} a metas pero la inversión vale ${f(input.investmentBalance)}. Liberá parte de una meta: el mismo dinero no puede contar dos veces.` })
  }
  if (input.totals && cents(input.totals.actualIncome) > 0n && cents(input.totals.totalExpenses) > cents(input.totals.actualIncome)) {
    warnings.push({ code: 'PLAN_DEFICIT', message: `Este mes los gastos reales (${f(input.totals.totalExpenses)}) superan los ingresos reales (${f(input.totals.actualIncome)}).` })
  }
  return warnings
}
