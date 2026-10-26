import { describe, expect, it, vi } from 'vitest'
import { TranquilityDashboardSchema, buildGoalMetrics } from '@lovehold/shared'
import { TranquilityReadService } from '../tranquility-read.service'

const month = '2026-10'
const config = {
  currency: 'UYU', netMonthlyIncome: '10000.00', essentialExpenses: '1050.00', monthlyContribution: '150.00',
  emergencyMonthlyContribution: '100.00', futureMonthlyExpense: '1500.00', multiplier: 150, emergencyMonths: 6,
  needsBps: 7000, wantsBps: 2000, futureBps: 1000, annualReturnPct: 5, annualInflationPct: 3, withdrawalRatePct: 4,
}
const budget = { month, currency: 'UYU', needsTarget: '7000.00', wantsTarget: '2000.00', futureTarget: '1000.00', configSnapshot: config }
const account = (id: string, purpose: string, opening: string, balance: string) => ({ id, name: id, profileId: 'profile-1', currency: 'UYU', purpose, openingBalance: opening, balance, createdAt: new Date('2026-01-01') })
const row = (id: string, type: string, amount: string, date: string, extra = {}) => ({ id, movementType: type, amount, currency: 'UYU', date: new Date(`${date}T12:00:00Z`), title: id, notes: null, financeAccountId: null, destinationAccountId: null, tranquilityCategoryId: null, categoryKey: null, tranquilityBucket: null, tranquilityFxSnapshot: null, tranquilityOwned: true, ...extra })

function fixture(rows = [row('expense', 'EXPENSE', '100.00', `${month}-02`, { tranquilityCategoryId: 'food', tranquilityBucket: 'NEEDS' })]) {
  const delegates = {
    tranquilityConfig: { findUnique: vi.fn().mockResolvedValue({ currency: 'UYU', config }) },
    tranquilityBudget: { findUnique: vi.fn().mockResolvedValue(budget), findMany: vi.fn().mockResolvedValue([budget]) },
    tranquilityCategory: { findMany: vi.fn().mockResolvedValue([{ id: 'food', name: 'Food', bucket: 'WANTS' }]) },
    financeAccount: { findMany: vi.fn().mockResolvedValue([account('op', 'OPERATING', '0.00', '0.00'), account('emergency', 'EMERGENCY', '1000.00', '1300.00'), account('investment', 'INVESTMENT', '2000.00', '2200.00')]) },
    personalExpense: { findMany: vi.fn().mockResolvedValue(rows) },
    tranquilityValuation: { findMany: vi.fn().mockResolvedValue([]) },
  }
  const profiles = { findByAuthUserId: vi.fn().mockResolvedValue({ id: 'profile-1' }) }
  return { service: new TranquilityReadService(delegates as never, profiles as never), delegates, profiles }
}

describe('TranquilityReadService dashboard', () => {
  it('returns the shared contract and owner scopes every query', async () => {
    const { service, delegates, profiles } = fixture()
    const result = await service.dashboard({ authUserId: 'auth-1' }, month)
    expect(TranquilityDashboardSchema.parse(result)).toEqual(result)
    expect(profiles.findByAuthUserId).toHaveBeenCalledWith('auth-1')
    expect(delegates.financeAccount.findMany).toHaveBeenCalledWith({ where: { profileId: 'profile-1' } })
    expect(delegates.personalExpense.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ profileId: 'profile-1' }) }))
  })
  it('uses the persisted bucket after the category was edited', async () => {
    const result = await fixture().service.dashboard({ authUserId: 'a' }, month)
    expect(result.summary.totals?.needs.executed).toBe('100.00')
    expect(result.summary.totals?.wants.executed).toBe('0.00')
  })
  it('reconstructs selected-month pools from opening balances and flows', async () => {
    const rows = [row('in', 'TRANSFER', '500.00', `${month}-03`, { financeAccountId: 'op', destinationAccountId: 'emergency' }), row('between', 'TRANSFER', '200.00', `${month}-04`, { financeAccountId: 'emergency', destinationAccountId: 'investment' })]
    const result = await fixture(rows).service.dashboard({ authUserId: 'a' }, month)
    expect(result.pools.emergency.balance).toBe('1300.00')
    expect(result.pools.investment.balance).toBe('2200.00')
    expect(result.pools.emergency.monthContributions).toBe('500.00')
    expect(result.pools.emergency.monthWithdrawals).toBe('200.00')
    expect(result.pools.investment.monthContributions).toBe('200.00')
  })
  it('does not count a pool-to-pool transfer as net funding', async () => {
    const rows = [row('between', 'TRANSFER', '200.00', `${month}-04`, { financeAccountId: 'emergency', destinationAccountId: 'investment' })]
    const result = await fixture(rows).service.dashboard({ authUserId: 'a' }, month)
    expect(result.summary.totals?.netPoolFunding).toBe('0.00')
    expect(result.pools.emergency.netContributedCapital).toBe('800.00')
    expect(result.pools.investment.netContributedCapital).toBe('2200.00')
  })
  it('uses the shared goal helper with the essential target', () => {
    const metrics = buildGoalMetrics({ config, emergencyBalance: '0.00', investmentBalance: '0.00' })
    expect(metrics.emergency.target).toBe('6300.00')
    expect(metrics.accumulation.target).toBe('22500.00')
    expect(metrics.financialIndependence.target).toBe('450000.00')
  })
  it('keeps old foreign expenses from making pool history incomplete', async () => {
    const old = row('old-usd', 'EXPENSE', '10.00', '2025-01-02', { currency: 'USD' })
    const result = await fixture([old]).service.dashboard({ authUserId: 'a' }, month)
    expect(result.summary.status).toBe('COMPLETE')
    expect(result.pools.emergency.status).toBe('COMPLETE')
  })
  it('marks a missing FX in a current expense', async () => {
    const foreign = row('foreign', 'EXPENSE', '10.00', `${month}-02`, { currency: 'USD' })
    const result = await fixture([foreign]).service.dashboard({ authUserId: 'a' }, month)
    expect(result.summary.status).toBe('MISSING_FX')
    expect(result.summary.totals).toBeNull()
  })
  it('rejects an invalid month inside the read service', async () => {
    await expect(fixture().service.dashboard({ authUserId: 'a' }, '2026-13')).rejects.toMatchObject({ status: 400 })
  })
  it('warns rather than inventing a zero opening balance', async () => {
    const data = fixture(); (data.delegates.financeAccount.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([account('emergency', 'EMERGENCY', null as never, '100.00'), account('investment', 'INVESTMENT', '0.00', '0.00')])
    const result = await data.service.dashboard({ authUserId: 'a' }, month)
    expect(result.pools.emergency.openingBalance).toBeNull()
    expect(result.warnings.some(w => w.code === 'UNRECONCILED_BALANCE')).toBe(true)
  })
  it('deduplicates repeated missing-budget warnings', async () => {
    const data = fixture(); (data.delegates.tranquilityBudget.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null); (data.delegates.tranquilityBudget.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    const result = await data.service.dashboard({ authUserId: 'a' }, month)
    expect(result.warnings.filter(w => w.code === 'MISSING_BUDGET')).toHaveLength(1)
  })
  it('reports historical totals only with an actual historical budget', async () => {
    const historical = row('hist', 'EXPENSE', '250.00', '2026-09-02', { tranquilityBucket: 'WANTS', tranquilityCategoryId: 'food' })
    const result = await fixture([historical]).service.dashboard({ authUserId: 'a' }, month)
    expect(result.monthlyHistory.find(h => h.month === '2026-09')?.totals).toBeNull()
  })
  it('does not call FX conversion for unrelated pool history', async () => {
    const foreign = row('unrelated', 'EXPENSE', '10.00', '2025-01-02', { currency: 'USD' })
    const result = await fixture([foreign]).service.dashboard({ authUserId: 'a' }, month)
    expect(result.pools.investment.balance).toBe('2200.00')
    expect(result.pools.investment.gains).toBeNull()
  })

  it('uses exactly the previous calendar month for comparison', async () => {
    const oldBudget = { ...budget, month: '2026-09' }
    const data = fixture([row('old', 'EXPENSE', '50.00', '2026-09-09', { tranquilityBucket: 'NEEDS', tranquilityCategoryId: 'food' }), row('current', 'EXPENSE', '25.00', `${month}-02`, { tranquilityBucket: 'NEEDS', tranquilityCategoryId: 'food' })])
    ;(data.delegates.tranquilityBudget.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([oldBudget])
    const result = await data.service.dashboard({ authUserId: 'a' }, month)
    expect(result.comparison?.previousMonth).toBe('2026-09')
  })
  it('keeps legacy expenses uncategorized when no snapshot exists', async () => {
    const result = await fixture([row('legacy', 'EXPENSE', '75.00', `${month}-02`)]).service.dashboard({ authUserId: 'a' }, month)
    expect(result.summary.totals?.uncategorizedExpenses).toBe('75.00')
    expect(result.summary.totals?.needs.executed).toBe('0.00')
  })
  it('excludes nonpositive legacy expenses and nulls that month totals', async () => {
    const result = await fixture([row('refund', 'EXPENSE', '-75.00', `${month}-02`)]).service.dashboard({ authUserId: 'a' }, month)
    expect(result.summary.totals).toBeNull()
    expect(result.movements).toHaveLength(0)
    expect(result.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'INVALID_LEGACY_MOVEMENT', movementIds: ['refund'] })]))
  })
  it('returns null pool balance when its account is in another currency', async () => {
    const data = fixture(); (data.delegates.financeAccount.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([account('investment', 'INVESTMENT', '100.00', '100.00'), { ...account('emergency', 'EMERGENCY', '100.00', '100.00'), currency: 'USD' }])
    const result = await data.service.dashboard({ authUserId: 'a' }, month)
    expect(result.pools.emergency.balance).toBeNull()
    expect(result.pools.emergency.status).toBe('MISSING_FX')
  })
  it('returns an empty safe report for invalid persisted config', async () => {
    const data = fixture(); (data.delegates.tranquilityConfig.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ currency: 'UYU', config: { currency: 'UYU' } })
    const result = await data.service.dashboard({ authUserId: 'a' }, month)
    expect(result.config).toBeNull()
    expect(result.warnings[0].code).toBe('INVALID_CONFIG')
  })
})
