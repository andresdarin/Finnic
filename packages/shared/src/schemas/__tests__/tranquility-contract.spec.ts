import { describe, expect, it } from 'vitest'
import { FxSnapshotSchema, NonNegativeTranquilityMoneySchema, SetupCommandSchema, TranquilityConfigSchema, TranquilityDateSchema, TranquilityDashboardSchema, TranquilityMoneySchema, TranquilityMovementSchema, TranquilityRateSchema, TranquilityScenarioSchema } from '../tranquility'

const config = { currency: 'UYU' as const, netMonthlyIncome: '100.00', essentialExpenses: '50.00', monthlyContribution: '10.00', emergencyMonthlyContribution: '5.00', futureMonthlyExpense: '0.00', annualReturnPct: -5, annualInflationPct: 0, withdrawalRatePct: 3.5 }
const movement = { id: 'm', type: 'EXPENSE' as const, amount: '1.00', currency: 'UYU' as const, date: '2026-02-01', concept: 'x', categoryId: 'c', note: null, financeAccountId: null, destinationAccountId: null, fxSnapshot: null }
describe('strict tranquility contract', () => {
  it.each(['0.0', '01.00', '-0.00', '90000000000000000.00'])('rejects invalid money %s', value => expect(TranquilityMoneySchema.safeParse(value).success).toBe(false))
  it.each(['not money', undefined, null, '-1.00'])('safeParse never throws for malformed nonnegative money %s', value => {
    expect(() => NonNegativeTranquilityMoneySchema.safeParse(value)).not.toThrow()
    expect(NonNegativeTranquilityMoneySchema.safeParse(value).success).toBe(false)
  })
  it.each(['0.00', '1.00', '90000000000000.00'])('accepts bounded money %s', value => expect(TranquilityMoneySchema.safeParse(value).success).toBe(true))
  it('rejects negative prohibited values', () => expect(TranquilityConfigSchema.safeParse({ ...config, essentialExpenses: '-1.00' }).success).toBe(false))
  it('defaults policy values', () => expect(TranquilityConfigSchema.parse(config)).toMatchObject({ multiplier: 150, emergencyMonths: 6, needsBps: 7000 }))
  it('requires bps to balance', () => expect(TranquilityConfigSchema.safeParse({ ...config, needsBps: 1 }).success).toBe(false))
  it('permits negative return and inflation above minus one hundred', () => expect(TranquilityConfigSchema.safeParse(config).success).toBe(true))
  it('rejects excessive withdrawal precision', () => expect(TranquilityConfigSchema.safeParse({ ...config, withdrawalRatePct: 3.555 }).success).toBe(false))
  it.each(['2026-02-29', '2026-13-01', '26-01-01'])('rejects date %s', value => expect(TranquilityDateSchema.safeParse(value).success).toBe(false))
  it('accepts leap date', () => expect(TranquilityDateSchema.safeParse('2024-02-29').success).toBe(true))
  it.each(['0', '1.123456789', '1000000.01'])('rejects invalid FX rate %s', value => expect(TranquilityRateSchema.safeParse(value).success).toBe(false))
  it('accepts bounded FX rate', () => expect(TranquilityRateSchema.safeParse('40.12345678').success).toBe(true))
  it('requires paired FX fields', () => expect(FxSnapshotSchema.safeParse({ toCurrency: 'USD', rate: '40', convertedAmount: '1.00', asOf: '2026-01-01' }).success).toBe(true))
  it('safeParse never throws for malformed FX movement values', () => expect(() => TranquilityMovementSchema.safeParse({ ...movement, amount: 'not money', fxSnapshot: { toCurrency: 'USD', rate: 'not rate', convertedAmount: 'not money', asOf: '2026-01-01' } })).not.toThrow())
  it('rejects unknown FX fields', () => expect(FxSnapshotSchema.safeParse({ toCurrency: 'USD', rate: '40', convertedAmount: '1.00', asOf: '2026-01-01', sourceCurrency: 'UYU' }).success).toBe(false))
  it('requires expense category', () => expect(TranquilityMovementSchema.safeParse({ ...movement, categoryId: null }).success).toBe(false))
  it('requires transfer accounts', () => expect(TranquilityMovementSchema.safeParse({ ...movement, type: 'TRANSFER', categoryId: null }).success).toBe(false))
  it('accepts canonical income', () => expect(TranquilityMovementSchema.safeParse({ ...movement, type: 'INCOME', categoryId: null }).success).toBe(true))
  it('accepts historical legacy movement gaps when not editable', () => expect(TranquilityMovementSchema.safeParse({ ...movement, type: 'TRANSFER', categoryId: null, financeAccountId: null, destinationAccountId: null, editable: false }).success).toBe(true))
  it('rejects unknown movement fields', () => expect(TranquilityMovementSchema.safeParse({ ...movement, fxRate: '2' }).success).toBe(false))
  it('separates setup openings from config', () => expect(SetupCommandSchema.safeParse({ config, emergencyInitial: '1.00', investmentInitial: '2.00', initialAvailable: '3.00' }).success).toBe(true))
  it('rejects setup unknown openings', () => expect(SetupCommandSchema.safeParse({ config, emergencyInitial: '1.00', investmentInitial: '2.00', initialAvailable: '3.00', openingBalance: '1.00' }).success).toBe(false))
  it('keeps scenarios nonnegative', () => expect(TranquilityScenarioSchema.safeParse({ id: 's', name: 'base', initialCapital: '0.00', monthlyContribution: '1.00', annualReturnPct: -5, annualInflationPct: 2, years: 1, contributionGrowthPct: 0, targetCapital: '1.00' }).success).toBe(true))
  it('rejects negative scenario capital', () => expect(TranquilityScenarioSchema.safeParse({ id: 's', name: 'base', initialCapital: '-1.00', monthlyContribution: '1.00', annualReturnPct: 5, annualInflationPct: 2, years: 1, contributionGrowthPct: 0, targetCapital: '1.00' }).success).toBe(false))
  it('rejects unknown dashboard keys', () => expect(TranquilityDashboardSchema.safeParse({ month: '2026-01', currency: 'UYU', extra: true }).success).toBe(false))
  it('requires real months', () => expect(TranquilityDateSchema.safeParse('2026-01-01').success).toBe(true))
})
