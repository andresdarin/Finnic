import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { config, makeFixture, month, movement, today } from './tranquility.integration.helpers'

const url = process.env.TRANQUILITY_TEST_DATABASE_URL
const parsed = url ? new URL(url) : null
const enabled = Boolean(parsed && parsed.protocol === 'postgresql:' && parsed.hostname === '127.0.0.1' && parsed.pathname.slice(1).startsWith('tranquility_'))
if (url && !enabled) throw new Error('TRANQUILITY_TEST_DATABASE_URL must target 127.0.0.1 and a tranquility_ database')
const suite = describe.skipIf(!enabled)
const prisma = enabled ? new PrismaClient({ adapter: new PrismaPg(url!) }) : null

suite('Tranquilidad PostgreSQL integration', () => {
  const fixtures: Awaited<ReturnType<typeof makeFixture>>[] = []
  let f: Awaited<ReturnType<typeof makeFixture>>
  beforeAll(async () => {
    const rows = await prisma!.$queryRaw<Array<{ count: bigint }>>`SELECT count(*)::bigint AS count FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL`
    expect(Number(rows[0]?.count)).toBeGreaterThanOrEqual(20)
  })
  beforeEach(async () => { f = await makeFixture(prisma!); fixtures.push(f) })
  afterAll(async () => { for (const fixture of fixtures) await fixture.cleanup(); await prisma?.$disconnect() })

  it('persists setup, exact allocation and rejects duplicate setup', async () => {
    const result: any = await f.setup(); expect(result.accounts).toHaveLength(3)
    expect(await prisma!.tranquilityCategory.count({ where: { profileId: f.profile.id } })).toBe(15)
    const budget: any = await prisma!.tranquilityBudget.findFirst({ where: { profileId: f.profile.id } })
    expect([budget.needsTarget, budget.wantsTarget, budget.futureTarget].map(String)).toEqual(['700', '200', '100'])
    await expect(f.setup()).rejects.toMatchObject({ status: 409 })
  })

  it('updates salary config without changing the persisted budget', async () => {
    await f.setup(); const before: any = await prisma!.tranquilityBudget.findFirst({ where: { profileId: f.profile.id } })
    await f.service.updateConfig(f.user, { ...config, netMonthlyIncome: '2000.00' })
    const after: any = await prisma!.tranquilityBudget.findFirst({ where: { profileId: f.profile.id } })
    expect(String(after.needsTarget)).toBe(String(before.needsTarget)); expect(after.configSnapshot).toEqual(before.configSnapshot)
  })

  it('credits income, debits expense, and snapshots the NEEDS category', async () => {
    const setup: any = await f.setup(); const account = setup.accounts[0]; const category: any = await prisma!.tranquilityCategory.findFirst({ where: { profileId: f.profile.id, bucket: 'NEEDS' } })
    await f.service.createMovement(f.user, movement({ type: 'INCOME', amount: '100.00', concept: 'salary', financeAccountId: account.id }))
    const expense: any = await f.service.createMovement(f.user, movement({ amount: '10.00', financeAccountId: account.id, categoryId: category.id }))
    expect(expense.tranquilityBucket).toBe('NEEDS'); expect(String((await prisma!.financeAccount.findUnique({ where: { id: account.id } }))!.balance)).toBe('1090')
  })

  it('patches an expense with reversal and delete restores the balance', async () => {
    const s: any = await f.setup(); const c: any = await prisma!.tranquilityCategory.findFirst({ where: { profileId: f.profile.id } })
    const row: any = await f.service.createMovement(f.user, movement({ amount: '100.00', financeAccountId: s.accounts[0].id, categoryId: c.id }))
    await f.service.patchMovement(f.user, row.id, { amount: '20.00' }); expect(String((await prisma!.financeAccount.findUnique({ where: { id: s.accounts[0].id } }))!.balance)).toBe('980')
    await f.service.deleteMovement(f.user, row.id); expect(String((await prisma!.financeAccount.findUnique({ where: { id: s.accounts[0].id } }))!.balance)).toBe('1000')
  })

  it('deleting income restores its starting balance', async () => {
    const s: any = await f.setup(); const row: any = await f.service.createMovement(f.user, movement({ type: 'INCOME', amount: '100.00', financeAccountId: s.accounts[0].id }))
    await f.service.deleteMovement(f.user, row.id); expect(String((await prisma!.financeAccount.findUnique({ where: { id: s.accounts[0].id } }))!.balance)).toBe('1000')
  })

  it('records pool contribution and withdrawal as funding, not income', async () => {
    const s: any = await f.setup(); const [op, emergency] = s.accounts
    const transfer = { type: 'TRANSFER', amount: '100.00', currency: 'UYU', date: today, concept: 'fund', categoryId: null, note: null, financeAccountId: op.id, destinationAccountId: emergency.id, fxSnapshot: null }
    const row: any = await f.service.createMovement(f.user, transfer); expect(row.movementType).toBe('TRANSFER')
    const dashboard: any = await f.service.dashboard(f.user, month); expect(dashboard.summary.totals.netPoolFunding).toBe('100.00'); expect(dashboard.summary.totals.actualIncome).toBe('0.00')
    await f.service.createMovement(f.user, { ...transfer, amount: '40.00', concept: 'withdraw', financeAccountId: emergency.id, destinationAccountId: op.id })
    const after: any = await f.service.dashboard(f.user, month); expect(after.summary.totals.netPoolFunding).toBe('60.00'); expect(after.summary.totals.poolWithdrawals).toBe('40.00')
  })

  it('moves emergency to investment without changing net funding', async () => {
    const s: any = await f.setup(); const [, emergency, investment] = s.accounts; await prisma!.financeAccount.update({ where: { id: emergency.id }, data: { balance: '100.00', openingBalance: '100.00' } }); const base = { type: 'TRANSFER', amount: '100.00', currency: 'UYU', date: today, categoryId: null, note: null, fxSnapshot: null }
    await f.service.createMovement(f.user, { ...base, amount: '50.00', concept: 'to investment', financeAccountId: emergency.id, destinationAccountId: investment.id })
    const d: any = await f.service.dashboard(f.user, month); expect(d.summary.totals.netPoolFunding).toBe('0.00'); expect(d.pools.investment.gains).toBe('0.00')
  })

  it('records valuation change without cash flow', async () => {
    const s: any = await f.setup(); const investment = s.accounts[2]
    await prisma!.financeAccount.update({ where: { id: investment.id }, data: { balance: '200.00', openingBalance: '200.00' } })
    await f.service.valuation(f.user, { accountId: investment.id, date: today, newBalance: '250.00', note: null })
    const d: any = await f.service.dashboard(f.user, month); expect(d.pools.investment.balance).toBe('250.00'); expect(d.pools.investment.gains).toBe('50.00'); expect(d.summary.totals.netPoolFunding).toBe('0.00')
  })

  it('creates, lists flat complete scenarios, then deletes persistence', async () => {
    const input = { name: 'base case', initialCapital: '100.00', monthlyContribution: '10.00', annualReturnPct: 6, annualInflationPct: 4, years: 5, contributionGrowthPct: 2, targetCapital: '1000.00' }
    const created: any = await f.service.createScenario(f.user, input); expect(created).toMatchObject(input); expect((await f.service.scenarios(f.user))[0]).toMatchObject(input)
    await f.service.deleteScenario(f.user, created.id); expect(await f.service.scenarios(f.user)).toHaveLength(0)
  })

  it('rejects foreign profile category and movement operations', async () => {
    await f.setup(); const other = await makeFixture(prisma!); fixtures.push(other); const otherSetup: any = await other.setup(); const foreignCategory: any = await prisma!.tranquilityCategory.findFirst({ where: { profileId: other.profile.id } }); const before = await prisma!.financeAccount.count({ where: { profileId: f.profile.id } })
    await expect(f.service.patchCategory(f.user, foreignCategory.id, { name: 'foreign' })).rejects.toMatchObject({ status: 404 })
    await expect(f.service.createMovement(f.user, movement({ financeAccountId: otherSetup.accounts[0].id, categoryId: foreignCategory.id }))).rejects.toMatchObject({ status: 404 })
    expect(await prisma!.financeAccount.count({ where: { profileId: f.profile.id } })).toBe(before)
  })

  it('converts cross-currency transfers and patch/delete restore balances', async () => {
    await f.setup(); const usd: any = await prisma!.financeAccount.create({ data: { profileId: f.profile.id, name: 'USD operating', currency: 'USD', purpose: 'OPERATING', balance: '100.00', openingBalance: '100.00' } }); const pool: any = await prisma!.financeAccount.create({ data: { profileId: f.profile.id, name: 'UYU pool', currency: 'UYU', purpose: 'EMERGENCY', balance: '0.00', openingBalance: '0.00' } })
    const fx = { toCurrency: 'UYU', rate: '40.00', convertedAmount: '400.00', asOf: today }; const base = { type: 'TRANSFER', amount: '10.00', currency: 'USD', date: today, concept: 'fx', categoryId: null, note: null, financeAccountId: usd.id, destinationAccountId: pool.id, fxSnapshot: fx }
    const row: any = await f.service.createMovement(f.user, base); expect(String((await prisma!.financeAccount.findUnique({ where: { id: pool.id } }))!.balance)).toBe('400')
    await f.service.patchMovement(f.user, row.id, { amount: '20.00', fxSnapshot: { ...fx, convertedAmount: '800.00' } }); await f.service.deleteMovement(f.user, row.id)
    expect(String((await prisma!.financeAccount.findUnique({ where: { id: usd.id } }))!.balance)).toBe('100'); expect(String((await prisma!.financeAccount.findUnique({ where: { id: pool.id } }))!.balance)).toBe('0')
  })

  it('uses native amount for same-currency transfers', async () => {
    const s: any = await f.setup(); const [op, emergency] = s.accounts; await f.service.createMovement(f.user, { type: 'TRANSFER', amount: '10.00', currency: 'UYU', date: today, concept: 'native', categoryId: null, note: null, financeAccountId: op.id, destinationAccountId: emergency.id, fxSnapshot: null })
    expect(String((await prisma!.financeAccount.findUnique({ where: { id: emergency.id } }))!.balance)).toBe('10')
  })

  it('rolls back invalid category and insufficient transfer', async () => {
    const s: any = await f.setup(); await expect(f.service.createMovement(f.user, movement({ financeAccountId: s.accounts[0].id, categoryId: 'missing' }))).rejects.toMatchObject({ status: 404 }); expect(String((await prisma!.financeAccount.findUnique({ where: { id: s.accounts[0].id } }))!.balance)).toBe('1000')
    await expect(f.service.createMovement(f.user, { type: 'TRANSFER', amount: '1001.00', currency: 'UYU', date: today, concept: 'too much', categoryId: null, note: null, financeAccountId: s.accounts[0].id, destinationAccountId: s.accounts[1].id, fxSnapshot: null })).rejects.toThrow(); expect(String((await prisma!.financeAccount.findUnique({ where: { id: s.accounts[0].id } }))!.balance)).toBe('1000')
  })

  it('reports missing FX legacy rows with a null summary, not a server error', async () => {
    await f.setup(); await prisma!.personalExpense.create({ data: { profileId: f.profile.id, title: 'legacy', amount: '10.00', date: new Date(`${today}T00:00:00Z`), type: 'variable', category: 'OTHER', monthKey: month, currency: 'USD', movementType: 'EXPENSE' } })
    const d: any = await f.service.dashboard(f.user, month); expect(d.summary.status).toBe('MISSING_FX'); expect(d.summary.totals).toBeNull(); expect(d.warnings.some((w: any) => w.code === 'MISSING_FX')).toBe(true)
  })

  it('rejects CREDIT source writes', async () => {
    await f.setup(); const credit: any = await prisma!.financeAccount.create({ data: { profileId: f.profile.id, name: 'credit source', currency: 'UYU', type: 'CREDIT', purpose: 'OPERATING', balance: '100.00', openingBalance: '100.00' } })
    await expect(f.service.createMovement(f.user, movement({ financeAccountId: credit.id, categoryId: null }))).rejects.toThrow()
  })

  it('does not crash on a legacy negative expense', async () => {
    await f.setup(); await prisma!.personalExpense.create({ data: { profileId: f.profile.id, title: 'negative legacy', amount: '-2.00', date: new Date(`${today}T00:00:00Z`), type: 'variable', category: 'OTHER', monthKey: month, currency: 'UYU', movementType: 'EXPENSE' } })
    const d: any = await f.service.dashboard(f.user, month)
    expect(d.summary.totals).toBeNull()
    expect(d.warnings.some((warning: { code: string }) => warning.code === 'INVALID_LEGACY_MOVEMENT')).toBe(true)
  })
})
