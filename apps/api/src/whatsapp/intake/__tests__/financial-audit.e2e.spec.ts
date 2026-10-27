import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { api, Edges, makeUser, startApp, testDatabaseUrl, textMessage, webhook } from './e2e.harness'
import { previousMonth } from '../parsing/query-period'
import { ToolRegistry } from '../../../ai/tools/tool.registry'

const url = testDatabaseUrl()
const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit' }).format(new Date())
const setup = { config: { currency: 'UYU', netMonthlyIncome: '100000.00', essentialExpenses: '50000.00', monthlyContribution: '10000.00', emergencyMonthlyContribution: '5000.00', futureMonthlyExpense: '60000.00', multiplier: 150, emergencyMonths: 6, needsBps: 7000, wantsBps: 2000, futureBps: 1000, annualReturnPct: 6, annualInflationPct: 4, withdrawalRatePct: 4 }, emergencyInitial: '20000.00', investmentInitial: '0.00', initialAvailable: '50000.00' }

describe.skipIf(!url)('Financial audit: actual shared reads with Gemini unavailable', () => {
  const edges = new Edges()
  let ctx: Awaited<ReturnType<typeof startApp>>
  let owner: Awaited<ReturnType<typeof makeUser>>, other: typeof owner, zero: typeof owner
  let baseline: number
  const say = async (message: string, user = owner) => {
    const form = new FormData(); form.set('requestId', randomUUID()); form.set('message', message)
    const response = await fetch(`${ctx.base}/ai/chat/intake`, { method: 'POST', headers: { Authorization: `Bearer ${user.token}` }, body: form })
    expect(response.status).toBe(201)
    return (await response.json()).text as string
  }
  beforeAll(async () => {
    edges.install(); edges.geminiDown = true; ctx = await startApp(url!)
    owner = await makeUser(ctx.prisma); other = await makeUser(ctx.prisma); zero = await makeUser(ctx.prisma)
    for (const user of [owner, zero]) expect((await api(ctx.base, user.token)('/finance/tranquility/setup', 'POST', setup)).status).toBe(201)
    await ctx.prisma.profile.update({ where: { id: owner.profile.id }, data: { whatsappPhone: `+${owner.phone}`, whatsappLinkedAt: new Date() } })
    const category = await ctx.prisma.tranquilityCategory.findFirstOrThrow({ where: { profileId: owner.profile.id, bucket: 'NEEDS' } })
    const base = { profileId: owner.profile.id, monthKey: month, date: new Date(`${month}-10T15:00:00Z`), type: 'variable', category: 'OTROS', currency: 'UYU', tranquilityCategoryId: category.id, tranquilityBucket: 'NEEDS' }
    await ctx.prisma.personalExpense.create({ data: { ...base, title: 'Ticket con dos unidades', amount: '400.00', items: { create: [{ name: 'Producto A', quantity: 2, unitPrice: 200, totalPrice: 400, category: 'OTROS' }] } } })
    await ctx.prisma.personalExpense.create({ data: { ...base, title: 'Otro ticket', amount: '350.00', items: { create: [{ name: 'Producto B', quantity: 1, unitPrice: 350, totalPrice: 350, category: 'OTROS' }] } } })
    await ctx.prisma.personalExpense.createMany({ data: [
      ...Array.from({ length: 35 }, (_, index) => ({ ...base, title: `Reciente ${index}`, date: new Date(`${month}-20T15:00:00Z`), amount: '1.00' })),
      { ...base, title: 'Ingreso real', amount: '1000.00', movementType: 'INCOME' },
      { ...base, title: 'Mes anterior', amount: '900.00', monthKey: previousMonth(month), date: new Date(`${previousMonth(month)}-10T15:00:00Z`) },
      { ...base, profileId: other.profile.id, tranquilityCategoryId: null, title: 'Privado ajeno', amount: '99999.00' },
    ] })
    baseline = await ctx.prisma.personalExpense.count({ where: { profileId: owner.profile.id } })
  }, 60000)
  afterAll(async () => {
    if (ctx) { await ctx.prisma.profile.deleteMany({ where: { id: { in: [owner?.profile.id, other?.profile.id, zero?.profile.id].filter(Boolean) } } }); await ctx.app.close() }
    vi.restoreAllMocks()
  })
  it('answers previous calendar month and comparison instead of repeating the current month', async () => {
    expect(await say('Cuánto gasté el mes pasado?')).toContain('900,00')
    const compared = await say('Gasté más o menos que el mes pasado? Compará la misma moneda.')
    expect(compared).toContain('785,00'); expect(compared).toContain('115,00 menos')
    expect(compared).not.toContain('Privado ajeno')
  })
  it('uses individual unit prices from the whole month, never a ticket or the largest quantity line', async () => {
    const reply = await say('Cuál fue el producto individual más caro que compré este mes, no el ticket completo?')
    expect(reply).toContain('Producto B'); expect(reply).toContain('350,00')
    expect(reply).not.toContain('Producto A'); expect(reply).toContain('parcial')
  })
  it('distinguishes a missing plan or card from a missing app feature', async () => {
    expect(await say('Cuántos meses cubre mi fondo de emergencia?', other)).toContain('todavía no configuraste')
    expect(await say('Cuál es mi deuda de tarjeta registrada?', other)).toContain('ninguna tarjeta activa')
    expect(await say('Cuál fue el producto individual más caro que compré este mes?', other)).toContain('No tengo precios unitarios')
  })
  it('uses real plan totals, rate, coverage and configured budgets', async () => {
    expect(await say('Cuál es mi tasa de ahorro este mes?')).toContain('21,5%')
    expect(await say('Cuál es mi ahorro neto este mes?')).toContain('215,00')
    expect(await say('Cuántos meses cubre mi fondo de emergencia?')).toContain('0,4 meses')
    expect(await say('Cómo sé si voy bien con mi presupuesto de necesidades, gustos y futuro?')).toContain('Necesidades: $U 785,00 de $U 70.000,00')
    const snapshot = await ctx.app.get(ToolRegistry).get('get_financial_snapshot').execute({}, { profileId: owner.profile.id }) as { financialPlan: { totals: { savingsRatePct: number } } }
    expect(snapshot.financialPlan.totals.savingsRatePct).toBe(21.5)
  })
  it('does not divide by zero or substitute planned salary for actual income', async () => {
    expect(await say('Cuál es mi tasa de ahorro este mes?', zero)).toContain('no está definida')
    expect(await say('Si un mes no tengo ingresos, mi tasa de ahorro se puede calcular igual?')).toContain('no está definida')
  })
  it('gives the same calendar result over the real WhatsApp worker without writes', async () => {
    expect(await webhook(ctx.base)(textMessage(owner.phone, 'Cuánto gasté el mes pasado?'))).toBe(200)
    await ctx.worker.drain(); expect(edges.lastTo(owner.phone)).toContain('900,00')
    expect(await ctx.prisma.personalExpense.count({ where: { profileId: owner.profile.id } })).toBe(baseline)
  })
})
