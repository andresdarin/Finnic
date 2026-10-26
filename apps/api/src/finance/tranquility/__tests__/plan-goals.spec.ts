import { describe, expect, it } from 'vitest'
import { monthsRemaining, requiredMonthlyContribution } from '../goals/goal-math'
import { planWarnings } from '../utils/plan-warnings'
import { evaluateRewards } from '../../../rewards/reward-rules'

const f = (value: string) => `$U ${value}`
const base = { essentialExpenses: '50000.00', monthlyContribution: '5000.00', emergencyMonthlyContribution: '5000.00', needsTarget: '70000.00', futureTarget: '10000.00', goalsRequiredMonthly: [], allocated: '0.00', investmentBalance: '0.00', totals: null, format: f }

describe('metas LLEGAR', () => {
  it('cuenta el mes actual y redondea hacia arriba para no subestimar', () => {
    expect(monthsRemaining('2026-10-23', '2026-10-31')).toBe(1)
    expect(monthsRemaining('2026-10-23', '2027-09-15')).toBe(12)
    expect(requiredMonthlyContribution('100.00', '0.00', '2026-12-01', '2026-10-23')).toBe('33.34')
    expect(requiredMonthlyContribution('100.00', '100.00', '2026-12-01', '2026-10-23')).toBeNull()
  })
  it('una meta vencida requiere todo el faltante', () => {
    expect(requiredMonthlyContribution('500.00', '200.00', '2026-01-01', '2026-10-23')).toBe('300.00')
  })
})

describe('plan que no cierra', () => {
  it('no advierte si el plan es consistente', () => {
    expect(planWarnings(base)).toEqual([])
  })
  it('advierte gastos esenciales, aportes y metas por encima de lo asignado', () => {
    const messages = planWarnings({ ...base, essentialExpenses: '80000.00', monthlyContribution: '8000.00', goalsRequiredMonthly: ['9000.00', '2000.00'] }).map(w => w.message)
    expect(messages).toHaveLength(3)
    expect(messages[0]).toContain('$U 80000.00')
    expect(messages[2]).toContain('$U 11000.00')
  })
  it('advierte asignaciones mayores a la inversión y gastos mayores a ingresos reales', () => {
    const codes = planWarnings({ ...base, allocated: '100.00', investmentBalance: '50.00', totals: { actualIncome: '1000.00', totalExpenses: '1500.00' } }).map(w => w.code)
    expect(codes).toEqual(['GOAL_OVERALLOCATED', 'PLAN_DEFICIT'])
  })
})

describe('Finnic Rewards', () => {
  const dashboard = (overrides: Record<string, unknown> = {}) => ({
    month: '2026-10', currency: 'UYU', config: { emergencyMonthlyContribution: '5000.00' }, budget: {},
    summary: { totals: { future: { target: '10000.00', executed: '10000.00' }, wants: { target: '20000.00', executed: '25000.00' } } },
    pools: { emergency: { monthContributions: '0.00' } }, goalMetrics: { emergency: { funded: false, target: '300000.00' } }, ...overrides,
  }) as never
  it('premia ahorro real, no gasto, con claves únicas por período', () => {
    const awards = evaluateRewards({ current: dashboard(), previous: null, completedGoals: [{ id: 'g1', name: 'Auto' }] })
    expect(awards.map(a => `${a.ruleKey}:${a.periodKey}`)).toEqual(['savings_target_met:2026-10', 'goal_completed:g1'])
  })
  it('solo premia el presupuesto de gustos en meses cerrados y respetados', () => {
    const previous = dashboard({ month: '2026-09', summary: { totals: { future: { target: '0.00', executed: '0.00' }, wants: { target: '20000.00', executed: '19999.99' } } } })
    expect(evaluateRewards({ current: dashboard(), previous, completedGoals: [] }).map(a => a.ruleKey)).toContain('wants_within_budget')
    const overspent = dashboard({ month: '2026-09' })
    expect(evaluateRewards({ current: dashboard(), previous: overspent, completedGoals: [] }).map(a => a.ruleKey)).not.toContain('wants_within_budget')
  })
})
