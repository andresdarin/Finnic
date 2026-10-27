import { describe, expect, it } from 'vitest'
import { normalizeSetup, suggestedContribution } from './onboardingUtils'
import type { SetupValues } from '../types'

const setup = (overrides: Partial<SetupValues> = {}): SetupValues => ({
  currency: 'UYU', netMonthlyIncome: '1500', essentialExpenses: '500', monthlyContribution: '0',
  emergencyMonthlyContribution: '0', futureMonthlyExpense: '800', multiplier: 150, emergencyMonths: 6,
  needsBps: 7000, wantsBps: 2000, futureBps: 1000, annualReturnPct: 6, annualInflationPct: 4,
  withdrawalRatePct: 3.5, emergencyInitial: '0', investmentInitial: '0', initialAvailable: '1,25', ...overrides,
})

describe('onboarding utilities', () => {
  it('normalizes singular future expenses and initial available with comma decimals', () => {
    const result = normalizeSetup(setup({ futureMonthlyExpense: '800,5', initialAvailable: '1,25' }))
    expect(result.value).toMatchObject({ futureMonthlyExpense: '800.50', initialAvailable: '1.25' })
  })

  it('uses exact shared allocation for the 10% suggestion without resetting a touched contribution', () => {
    expect(suggestedContribution('1500')).toBe('150.00')
    const result = normalizeSetup(setup({ monthlyContribution: '42', netMonthlyIncome: '2000' }))
    expect(result.value?.monthlyContribution).toBe('42.00')
  })
})
