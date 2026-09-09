import { describe, expect, it } from 'vitest'
import { baseSpendable, getFinancialSnapshot, projectedCashCurve } from '..'

describe('accountless balances', () => {
  const input = {
    asOf: '2026-09-01T12:00:00.000Z',
    baseCurrency: 'UYU' as const,
    timeZone: 'America/Montevideo',
    minimumBuffer: '0.00',
    accounts: [{ type: 'BANK', currency: 'UYU', balance: '1000.00', isSpendable: true }],
    accountlessBalancesByCurrency: { UYU: '375.00' },
    scheduledCashFlows: [],
    goals: [],
    expenses: [],
    fxQuotes: [],
  }

  it('folds accountless net into balances and the projected opening balance once', () => {
    const snapshot = getFinancialSnapshot(input)

    expect(snapshot.balances.spendableByCurrency.UYU).toBe('1375.00')
    expect(baseSpendable(input)).toBe(137500n)
    expect(projectedCashCurve(input)[0]).toMatchObject({ date: '2026-09-01', balance: 137500n })
  })

  it('keeps an unconverted USD balance and reports partial base conversion', () => {
    const snapshot = getFinancialSnapshot({ ...input, accountlessBalancesByCurrency: { USD: '10.00' } })

    expect(snapshot.balances.spendableByCurrency.USD).toBe('10.00')
    expect(snapshot.balances.spendableInBase).toBeNull()
    expect(snapshot.warnings).toContainEqual({ code: 'PARTIAL_FX' })
  })
})
