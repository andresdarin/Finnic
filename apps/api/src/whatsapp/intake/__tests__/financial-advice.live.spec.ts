import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ConfigService } from '@nestjs/config'
import { AgentOrchestrator } from '../../../ai/agent/agent.orchestrator'
import { AiConversationService } from '../../../ai/conversation/ai-conversation.service'
import { FinanceMetricsService } from '../../../finance/application/finance-metrics.service'
import { api, makeUser, startApp, testDatabaseUrl } from './e2e.harness'

const url = testDatabaseUrl(), key = process.env.FINNIC_LIVE_API_KEY
const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit' }).format(new Date())
const setup = { config: { currency: 'UYU', netMonthlyIncome: '100000.00', essentialExpenses: '50000.00', monthlyContribution: '10000.00', emergencyMonthlyContribution: '5000.00', futureMonthlyExpense: '60000.00', multiplier: 150, emergencyMonths: 6, needsBps: 7000, wantsBps: 2000, futureBps: 1000, annualReturnPct: 6, annualInflationPct: 4, withdrawalRatePct: 4 }, emergencyInitial: '20000.00', investmentInitial: '0.00', initialAvailable: '50000.00' }

/** Opt-in real-provider review. Only synthetic local data leaves the machine; no Meta calls. */
describe.skipIf(!url || !key)('Financial advice grounded in a populated local profile (live Gemini)', () => {
  let ctx: Awaited<ReturnType<typeof startApp>>, user: Awaited<ReturnType<typeof makeUser>>
  const results: unknown[] = []
  beforeAll(async () => {
    ctx = await startApp(url!); user = await makeUser(ctx.prisma)
    ctx.app.get(ConfigService).set('GEMINI_API_KEY', key)
    ctx.app.get(ConfigService).set('GEMINI_API_MODEL', 'gemini-3.1-flash-lite')
    process.env.GEMINI_API_MODEL = 'gemini-3.1-flash-lite'
    expect((await api(ctx.base, user.token)('/finance/tranquility/setup', 'POST', setup)).status).toBe(201)
    const categories = await ctx.prisma.tranquilityCategory.findMany({ where: { profileId: user.profile.id } })
    const base = { profileId: user.profile.id, monthKey: month, date: new Date(`${month}-10T15:00:00Z`), type: 'variable', category: 'OTROS', currency: 'UYU' }
    await ctx.prisma.personalExpense.createMany({ data: [
      { ...base, title: 'Sueldo efectivo', amount: '100000.00', movementType: 'INCOME' },
      { ...base, title: 'Necesidades efectivas', amount: '45000.00', tranquilityBucket: 'NEEDS', tranquilityCategoryId: categories.find(c => c.bucket === 'NEEDS')!.id },
      { ...base, title: 'Gustos efectivos', amount: '10000.00', tranquilityBucket: 'WANTS', tranquilityCategoryId: categories.find(c => c.bucket === 'WANTS')!.id },
    ] })
    await ctx.prisma.financeAccount.createMany({ data: [
      { profileId: user.profile.id, name: 'Tarjeta de prueba', type: 'CREDIT', currency: 'UYU', balance: '12000.00', creditLimit: '100000.00' },
      { profileId: user.profile.id, name: 'Cuenta USD de prueba', type: 'BANK', currency: 'USD', balance: '1000.00' },
    ] })
  }, 60000)
  afterAll(async () => {
    if (results.length) { const dir = resolve('../../tmp/finnic-financial-retest-20261027'); await mkdir(dir, { recursive: true }); await writeFile(resolve(dir, 'populated-profile-live.json'), JSON.stringify(results, null, 2)) }
    if (ctx) { if (user) await ctx.prisma.profile.delete({ where: { id: user.profile.id } }); await ctx.app.close() }
  })
  it.each([
    'Según mis métricas reales, cuánto ahorro neto y qué tasa de ahorro tengo este mes? Explicalo corto.',
    'Con mi fondo de emergencia y mis gastos esenciales, cuánto me cubre y qué priorizarías?',
    'Con la deuda de tarjeta registrada y mis ahorros, qué debería mirar antes de invertir?',
    'Cómo voy con necesidades y gustos frente a mi presupuesto? Usá mis números reales.',
  ])('uses actual tools and preserves the fixture: %s', async question => {
    const before = await ctx.prisma.personalExpense.count({ where: { profileId: user.profile.id } })
    const conversation = await ctx.app.get(AiConversationService).ensureConversation(user.profile.id)
    const answer = await ctx.app.get(AgentOrchestrator).run({ profileId: user.profile.id, conversationId: conversation.id, message: question, channel: 'whatsapp' })
    results.push({ question, answer, actualPlan: await ctx.app.get(FinanceMetricsService).plan(user.profile.id) })
    expect(answer.kind).not.toBe('error')
    expect(answer.toolCalls?.some(call => call.success && call.name === 'get_financial_snapshot')).toBe(true)
    expect(answer.pendingActionId).toBeUndefined()
    expect(await ctx.prisma.personalExpense.count({ where: { profileId: user.profile.id } })).toBe(before)
  }, 60000)
})
