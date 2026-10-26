import { describe, expect, it } from 'vitest'
import { CreateTranquilityMovementSchema, SetupCommandSchema, TranquilityConfigSchema } from '@lovehold/shared'

const config = { currency: 'UYU', netMonthlyIncome: '1000.00', essentialExpenses: '500.00', monthlyContribution: '100.00', emergencyMonthlyContribution: '50.00', futureMonthlyExpense: '0.00', multiplier: 150, emergencyMonths: 6, needsBps: 7000, wantsBps: 2000, futureBps: 1000, annualReturnPct: 6, annualInflationPct: 4, withdrawalRatePct: 3.5 }
const movement = { type: 'EXPENSE', amount: '10.00', currency: 'UYU', date: '2026-01-01', concept: 'test', categoryId: 'cat', note: null, financeAccountId: 'account', destinationAccountId: null, fxSnapshot: null }

describe('Tranquilidad write command boundaries', () => {
  it.each([
    ['valid config', config, true], ['currency required', { ...config, currency: undefined }, false], ['bps must balance', { ...config, wantsBps: 1 }, false],
  ])('%s', (_, value, valid) => expect(TranquilityConfigSchema.safeParse(value).success).toBe(valid))
  it.each([
    ['valid setup', { config, emergencyInitial: '0.00', investmentInitial: '0.00', initialAvailable: '70.00' }, true],
    ['unknown setup field', { config, emergencyInitial: '0.00', investmentInitial: '0.00', initialAvailable: '70.00', reset: true }, false],
    ['negative opening', { config, emergencyInitial: '-1.00', investmentInitial: '0.00', initialAvailable: '70.00' }, false],
  ])('%s', (_, value, valid) => expect(SetupCommandSchema.safeParse(value).success).toBe(valid))
  it.each([
    ['valid expense', movement, true], ['nullable source is rejected by service guard', { ...movement, financeAccountId: null }, true], ['missing category', { ...movement, categoryId: null }, false],
    ['future date remains syntactically valid', { ...movement, date: '2099-01-01' }, true], ['negative amount', { ...movement, amount: '-1.00' }, false],
    ['transfer requires destination', { ...movement, type: 'TRANSFER', destinationAccountId: null }, false],
    ['income may omit category', { ...movement, type: 'INCOME', categoryId: null }, true],
    ['same-currency fx is invalid', { ...movement, fxSnapshot: { toCurrency: 'UYU', rate: '1.00', convertedAmount: '10.00', asOf: '2026-01-01' } }, false],
    ['foreign fx converts exactly', { ...movement, currency: 'USD', fxSnapshot: { toCurrency: 'UYU', rate: '40.00', convertedAmount: '400.00', asOf: '2026-01-01' } }, true],
  ])('%s', (_, value, valid) => expect(CreateTranquilityMovementSchema.safeParse(value).success).toBe(valid))
})
