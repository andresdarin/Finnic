import { describe, expect, it } from 'vitest'
import { availableToSpend, categorySpending, currentMonth, normalizeConfig, shiftMonth } from '../utils'

describe('tranquility dashboard utilities', () => {
  it('shifts calendar months without local timezone drift', () => {
    expect(shiftMonth('2024-01', -1)).toBe('2023-12')
    expect(shiftMonth('2024-12', 1)).toBe('2025-01')
  })

  it('normalizes money inputs before validating the shared config', () => {
    const config = { currency: 'UYU' as const, netMonthlyIncome: '1200', essentialExpenses: '500,5', monthlyContribution: '100', emergencyMonthlyContribution: '50', futureMonthlyExpense: '800', multiplier: 1.5, emergencyMonths: 6, needsBps: 7000, wantsBps: 2000, futureBps: 1000, annualReturnPct: 5, annualInflationPct: 4, withdrawalRatePct: 4 }
    expect(normalizeConfig(config)).toMatchObject({ netMonthlyIncome: '1200.00', essentialExpenses: '500.50' })
  })

  it('uses Montevideo calendar month at an injectable instant', () => {
    expect(currentMonth(new Date('2026-03-01T02:30:00Z'))).toBe('2026-02')
  })

  it('calculates available spending from actual expenses', () => {
    const dashboard = { currency: 'UYU', summary: { totals: { needs: { target: '700.00' }, wants: { target: '200.00' }, totalExpenses: '350.00' } } } as any
    expect(availableToSpend(dashboard)).toBe('550.00')
  })

  it('converts category totals only from a valid FX snapshot', () => {
    const dashboard = { currency: 'UYU', categories: [{ id: 'food', name: 'Comida' }], movements: [
      { type: 'EXPENSE', categoryId: 'food', amount: '100.00', currency: 'UYU' },
      { type: 'EXPENSE', categoryId: 'food', amount: '10.00', currency: 'USD', fxSnapshot: { toCurrency: 'UYU', convertedAmount: '400.00' } },
      { type: 'EXPENSE', categoryId: 'food', amount: '5.00', currency: 'USD', fxSnapshot: null },
    ] } as any
    expect(categorySpending(dashboard)).toMatchObject({ missingFx: true, rows: [{ name: 'Comida', amount: 500 }] })
  })
})
