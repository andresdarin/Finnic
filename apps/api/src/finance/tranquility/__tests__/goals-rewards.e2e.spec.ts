import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { api, Edges, makeUser, startApp, testDatabaseUrl } from '../../../whatsapp/intake/__tests__/e2e.harness'

const url = testDatabaseUrl()
const suite = describe.skipIf(!url)
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo' }).format(new Date())
const month = today.slice(0, 7)
const inMonths = (n: number) => { const d = new Date(`${month}-15T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10) }
const config = { currency: 'UYU', netMonthlyIncome: '100000.00', essentialExpenses: '50000.00', monthlyContribution: '5000.00', emergencyMonthlyContribution: '5000.00', futureMonthlyExpense: '60000.00', multiplier: 150, emergencyMonths: 6, needsBps: 7000, wantsBps: 2000, futureBps: 1000, annualReturnPct: 6, annualInflationPct: 4, withdrawalRatePct: 4 }

suite('Tranquilidad: metas LLEGAR, plan, capacidad y Rewards (HTTP + PostgreSQL real)', () => {
  let ctx: Awaited<ReturnType<typeof startApp>>
  let user: Awaited<ReturnType<typeof makeUser>>
  let call: ReturnType<typeof api>
  const ids: Record<string, string> = {}
  const dashboard = async () => (await call(`/finance/tranquility?month=${month}`)).body

  beforeAll(async () => {
    new Edges().install()
    ctx = await startApp(url!)
    user = await makeUser(ctx.prisma)
    call = api(ctx.base, user.token)
    expect((await call('/finance/tranquility/setup', 'POST', { config, emergencyInitial: '20000.00', investmentInitial: '0.00', initialAvailable: '50000.00' })).status).toBe(201)
    const accounts = await ctx.prisma.financeAccount.findMany({ where: { profileId: user.profile.id } })
    ids.operating = accounts.find(a => a.purpose === 'OPERATING')!.id
  }, 60_000)

  afterAll(async () => {
    if (user) await ctx.prisma.profile.delete({ where: { id: user.profile.id } }).catch(() => undefined)
    await ctx?.app.close()
    vi.restoreAllMocks()
  })

  it('crea una meta con monto y fecha y calcula el aporte mensual requerido', async () => {
    const created = await call('/finance/tranquility/goals', 'POST', { name: 'Auto', targetAmount: '120000.00', targetDate: inMonths(11) })
    expect(created.status).toBe(201)
    ids.goal = created.body.id
    const list = (await call('/finance/tranquility/goals')).body
    expect(list.goals[0]).toMatchObject({ name: 'Auto', allocatedAmount: '0.00', shortfall: '120000.00', monthsRemaining: 12, requiredMonthly: '10000.00' })
  })

  it('un aporte es una transferencia real a inversión, no un gasto', async () => {
    const expensesBefore = await ctx.prisma.personalExpense.count({ where: { profileId: user.profile.id, movementType: 'EXPENSE' } })
    expect((await call(`/finance/tranquility/goals/${ids.goal}/contributions`, 'POST', { amount: '10000.00', date: today, sourceAccountId: ids.operating })).status).toBe(201)
    expect(await ctx.prisma.personalExpense.count({ where: { profileId: user.profile.id, movementType: 'EXPENSE' } })).toBe(expensesBefore)
    const d = await dashboard()
    expect(d.summary.totals.future.executed).toBe('10000.00')
    expect(d.pools.investment.balance).toBe('10000.00')
    // Capital backing the goal is not counted again for the personal ×150 goal nor FI.
    expect(d.goalMetrics.accumulation.current).toBe('0.00')
    expect(d.goalMetrics.financialIndependence.current).toBe('0.00')
    expect((await call('/finance/tranquility/goals')).body.goals[0]).toMatchObject({ allocatedAmount: '10000.00', shortfall: '110000.00', requiredMonthly: '9166.67' })
  })

  it('no permite asignar el mismo dinero a dos metas ni usar el fondo de emergencia', async () => {
    const other = (await call('/finance/tranquility/goals', 'POST', { name: 'Viaje', targetAmount: '30000.00', targetDate: inMonths(2) })).body
    ids.trip = other.id
    const rejected = await call(`/finance/tranquility/goals/${other.id}/allocations`, 'POST', { amount: '1.00', date: today })
    expect(rejected.status).toBe(400)
    expect(rejected.body.message).toContain('mismo dinero')
  })

  it('advierte cuando el plan no cierra', async () => {
    const warnings = (await dashboard()).warnings.filter((w: any) => w.code === 'PLAN_DEFICIT').map((w: any) => w.message)
    expect(warnings.some((m: string) => m.includes('metas LLEGAR necesitan'))).toBe(true)
    await call('/finance/tranquility/config', 'PUT', { ...config, essentialExpenses: '80000.00' })
    expect((await dashboard()).warnings.some((w: any) => w.message.includes('gastos esenciales declarados'))).toBe(true)
  })

  it('la capacidad de gasto excluye emergencia e inversión y descuenta la deuda de tarjeta una vez', async () => {
    const before = (await call('/finance/spending-capacity?window=restOfMonth')).body
    expect(before.protectedCapacity.amount).toBe('40000.00') // 50.000 − 10.000 aportados; los 20.000 de emergencia no son libres
    const card = (await call('/finance/accounts', 'POST', { name: 'Visa', type: 'CREDIT', currency: 'UYU', initialBalance: '0' })).body
    expect((await call('/finance/expenses', 'POST', { title: 'Ropa', amount: '1000', currency: 'UYU', date: new Date().toISOString(), category: 'compras', financeAccountId: card.id })).status).toBe(201)
    expect((await call('/finance/spending-capacity?window=restOfMonth')).body.protectedCapacity.amount).toBe('39000.00')
    expect((await call('/finance/transfers', 'POST', { sourceAccountId: ids.operating, destinationAccountId: card.id, amount: '1000', date: new Date().toISOString() })).status).toBe(201)
    expect((await call('/finance/spending-capacity?window=restOfMonth')).body.protectedCapacity.amount).toBe('39000.00') // paying the card is not a second expense
  })

  it('otorga puntos por ahorro real sin duplicarlos y limita el canje al presupuesto de gustos', async () => {
    const first = (await call('/rewards')).body
    expect(first.balance).toBe(100)
    expect(first.entries.map((e: any) => e.description)).toContain(`Apartaste el ahorro planificado de ${month}`)
    expect((await call('/rewards')).body.balance).toBe(100)
    const expensive = (await call('/rewards/items', 'POST', { name: 'Consola', pointsCost: 50, priceAmount: '25000.00' })).body
    const denied = await call(`/rewards/items/${expensive.id}/redeem`, 'POST', { idempotencyKey: 'redeem-consola-1' })
    expect(denied.status).toBe(400)
    expect(denied.body.message).toContain('Los puntos no crean dinero')
    const dinner = (await call('/rewards/items', 'POST', { name: 'Cena', pointsCost: 100, priceAmount: '3000.00' })).body
    expect((await call(`/rewards/items/${dinner.id}/redeem`, 'POST', { idempotencyKey: 'redeem-cena-1' })).body).toMatchObject({ redeemed: true, balance: 0 })
    expect((await call(`/rewards/items/${dinner.id}/redeem`, 'POST', { idempotencyKey: 'redeem-cena-1' })).body).toMatchObject({ redeemed: true, balance: 0 })
    expect((await call(`/rewards/items/${dinner.id}/redeem`, 'POST', { idempotencyKey: 'redeem-cena-2' })).status).toBe(400)
    expect(await ctx.prisma.personalExpense.count({ where: { profileId: user.profile.id, title: { contains: 'Cena' } } })).toBe(0)
  })
})
