import { describe, expect, it } from 'vitest'
import { aggregateExpenses, allocateBudget, buildGoalMetrics, convertCurrency, emergencyMetrics, fiTarget, formatTranquilityCents, parseTranquilityCents, simulateGrowth } from '../index'

describe('tranquility exact accounting', () => {
  it('allocates largest remainder exactly', () => { const a = allocateBudget('0.05', 3333, 3333, 3334); expect(a).toEqual({ needs: '0.02', wants: '0.01', future: '0.02' }) })
  it('parses bounded cents and converts deterministically', () => { expect(formatTranquilityCents(parseTranquilityCents('-1.20'))).toBe('-1.20'); expect(convertCurrency('10.00', '40.25')).toBe('402.50'); expect(() => parseTranquilityCents('1.2')).toThrow() })
  it('calculates emergency coverage and excludes transfers', () => { expect(emergencyMetrics('100.00', '250.00', 2).funded).toBe(true); expect(aggregateExpenses([{ id: 'x', type: 'TRANSFER', amount: '9.00', currency: 'UYU', date: '2026-01-01', concept: 'x' }], 'UYU').amount).toBe('0.00') })
  it('supports zero return and inflation in bounded simulations', () => { const result = simulateGrowth({ initialCapital: '0.00', monthlyContribution: '100.00', annualReturnPct: 0, annualInflationPct: 2, years: 1, contributionGrowthPct: 0, targetCapital: '1200.00' }); expect(result.points[1].total).toBe('1200.00'); expect(result.points[1].realTotal).toBe('1176.47') })
  it('uses end-month deposits with negative returns', () => { const result = simulateGrowth({ initialCapital: '100.00', monthlyContribution: '0.00', annualReturnPct: -12, annualInflationPct: -5, years: 1, contributionGrowthPct: 0, targetCapital: '1000.00' }); expect(result.points[1].total).toBe('88.00') })
  it('includes opening capital at year zero', () => { expect(simulateGrowth({ initialCapital: '10.00', monthlyContribution: '1.00', annualReturnPct: 0, annualInflationPct: 0, years: 0, contributionGrowthPct: 0, targetCapital: '10.00' }).yearsToGoal).toBe(0) })
  it('returns null for an unreachable target', () => { expect(simulateGrowth({ initialCapital: '0.00', monthlyContribution: '0.00', annualReturnPct: 0, annualInflationPct: 0, years: 1, contributionGrowthPct: 0, targetCapital: '10.00' }).yearsToGoal).toBeNull() })
  it('rounds FX at cents exactly', () => { expect(convertCurrency('1.00', '1.005')).toBe('1.01') })
  it('marks incomplete FX rather than omitting expense', () => { const result = aggregateExpenses([{ id: 'foreign', type: 'EXPENSE', amount: '2.00', currency: 'USD', date: '2026-01-01', concept: 'x', categoryId: 'c', note: null, financeAccountId: null, destinationAccountId: null, fxSnapshot: null }], 'UYU'); expect(result).toMatchObject({ status: 'MISSING_FX', amount: null, missingFx: ['foreign'] }) })
  it('handles zero essential expenses', () => { expect(emergencyMetrics('0.00', '0.00', 6)).toMatchObject({ monthsCovered: null, funded: true }) })
  it('keeps FI independent from accumulation multiplier and rounds up', () => {
    expect(fiTarget('1500.00', 4, 150)).toBe('450000.00')
    expect(fiTarget('1500.00', 3.5, 150)).toBe('514285.72')
  })
  it('builds the three independent goal formulas', () => {
    const config = { currency: 'UYU' as const, netMonthlyIncome: '1000.00', essentialExpenses: '100.00',
      monthlyContribution: '150.00', emergencyMonthlyContribution: '25.00', futureMonthlyExpense: '1500.00',
      multiplier: 150, emergencyMonths: 6, needsBps: 7000, wantsBps: 2000, futureBps: 1000,
      annualReturnPct: 6, annualInflationPct: 4, withdrawalRatePct: 4 }
    const metrics = buildGoalMetrics({ config, emergencyBalance: '0.00', investmentBalance: '0.00' })
    expect(metrics.emergency.target).toBe('600.00')
    expect(metrics.accumulation.target).toBe('22500.00')
    expect(metrics.financialIndependence.target).toBe('450000.00')
    const funded = buildGoalMetrics({ config, emergencyBalance: '600.00', investmentBalance: '450000.00' })
    expect(funded.financialIndependence.estimatedMonthlyWithdrawal).toBe('1500.00')
    expect(funded.financialIndependence.yearsToGoal).toBe(0)
  })
  it('rejects negative goal balances and assumptions', () => {
    const config = { currency: 'UYU' as const, netMonthlyIncome: '1.00', essentialExpenses: '-1.00', monthlyContribution: '0.00', emergencyMonthlyContribution: '0.00', futureMonthlyExpense: '0.00', multiplier: 150, emergencyMonths: 0, needsBps: 7000, wantsBps: 2000, futureBps: 1000, annualReturnPct: 0, annualInflationPct: 0, withdrawalRatePct: 4 }
    expect(() => buildGoalMetrics({ config, emergencyBalance: '0.00', investmentBalance: '0.00' })).toThrow()
    expect(() => buildGoalMetrics({ config: { ...config, essentialExpenses: '0.00' }, emergencyBalance: '-1.00', investmentBalance: '0.00' })).toThrow()
  })
  it('rejects deterministic simulation overflow', () => { expect(() => simulateGrowth({ initialCapital: '90000000000000.00', monthlyContribution: '90000000000000.00', annualReturnPct: 99, annualInflationPct: 0, years: 100, contributionGrowthPct: 99, targetCapital: '1.00' })).toThrow('overflow') })
})
