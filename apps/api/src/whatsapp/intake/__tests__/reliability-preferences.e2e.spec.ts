import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { api, Edges, makeUser, startApp, testDatabaseUrl, textMessage, webhook } from './e2e.harness'
import { FinanceActivityService } from '../../../finance/application/finance-activity.service'

const url = testDatabaseUrl()
describe.skipIf(!url)('Local Docker: financial answers and explicit memory across channels', () => {
  const edges = new Edges()
  let ctx: Awaited<ReturnType<typeof startApp>>
  let owner: Awaited<ReturnType<typeof makeUser>>, other: Awaited<ReturnType<typeof makeUser>>
  let bankId: string
  const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit' }).format(new Date())
  const appSay = async (message: string, token = owner.token) => {
    const form = new FormData()
    form.set('message', message); form.set('requestId', randomUUID())
    const response = await fetch(`${ctx.base}/ai/chat/intake`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
    expect(response.status).toBe(201)
    return (await response.json()).text as string
  }
  const waSay = async (body: string) => {
    expect(await webhook(ctx.base)(textMessage(owner.phone, body))).toBe(200)
    await ctx.worker.drain()
    return edges.lastTo(owner.phone)
  }
  beforeAll(async () => {
    edges.install(); edges.geminiDown = true
    ctx = await startApp(url!)
    owner = await makeUser(ctx.prisma); other = await makeUser(ctx.prisma)
    await ctx.prisma.profile.update({ where: { id: owner.profile.id }, data: { whatsappPhone: `+${owner.phone}`, whatsappLinkedAt: new Date() } })
    bankId = (await api(ctx.base, owner.token)('/finance/accounts', 'POST', { name: 'Banco habitual', type: 'BANK', currency: 'UYU', initialBalance: '5000' })).body.id
    const base = { profileId: owner.profile.id, monthKey: month, type: 'variable', category: 'OTROS', currency: 'UYU' }
    await ctx.prisma.personalExpense.createMany({ data: [
      { ...base, title: 'Compra mayor fuera de los últimos treinta', amount: '999.99', date: new Date(`${month}-01T15:00:00Z`) },
      ...Array.from({ length: 35 }, (_, i) => ({ ...base, title: `Gasto reciente ${i}`, amount: '1.00', date: new Date(`${month}-02T15:${String(i).padStart(2, '0')}:00Z`) })),
      { ...base, title: 'Ingreso que no es gasto', amount: '999999.00', movementType: 'INCOME', date: new Date(`${month}-03T15:00:00Z`) },
      { ...base, title: 'Compra USD', merchant: 'Compra USD', amount: '1500.00', currency: 'USD', date: new Date(`${month}-03T15:00:00Z`) },
      { ...base, profileId: other.profile.id, title: 'Gasto privado de otra persona', amount: '99999.00', date: new Date(`${month}-03T15:00:00Z`) },
    ] })
  }, 60000)
  afterAll(async () => {
    if (ctx) { await ctx.prisma.profile.deleteMany({ where: { id: { in: [owner?.profile.id, other?.profile.id].filter(Boolean) } } }); await ctx.app.close() }
    vi.restoreAllMocks()
  })
  it('answers the highest expense over the full month, excluding income and other profiles even with Gemini unavailable', async () => {
    const reply = await appSay('Hasta ahora, qué fue lo más caro que compré este mes en pesos?')
    expect(reply).toContain('Compra mayor fuera de los últimos treinta')
    expect(reply).toContain('999,99')
    expect(reply).not.toContain('Ingreso')
    expect(reply).not.toContain('privado')
    expect(await ctx.prisma.personalExpense.count({ where: { profileId: owner.profile.id } })).toBe(38)
  })
  it('keeps currencies separate and gives the same result through the real webhook worker', async () => {
    const reply = await waSay('Cuál fue mi mayor gasto de este mes?')
    expect(reply).toContain('999,99')
    expect(reply).toContain('1.500,00')
    expect(reply).toContain('monedas van por separado')
    expect(reply).not.toContain('en Compra USD')
  })
  it('persists explicit defaults from app to WhatsApp and never changes another profile', async () => {
    expect(await appSay('Mi cuenta habitual es Banco habitual')).toContain('Banco habitual')
    const saved = await ctx.prisma.profile.findUniqueOrThrow({ where: { id: owner.profile.id } })
    expect(saved.whatsappDefaultAccountId).toBe(bankId)
    expect(saved.whatsappDefaultCurrency).toBe('UYU')
    const remembered = await ctx.app.get(FinanceActivityService).accounts(owner.profile.id)
    expect(remembered.paymentPreferences).toMatchObject({ currency: 'UYU', account: { id: bankId, name: 'Banco habitual' } })
    expect(await waSay('Usá dólares por defecto')).toContain('dólares')
    const switched = await ctx.prisma.profile.findUniqueOrThrow({ where: { id: owner.profile.id } })
    expect(switched.whatsappDefaultCurrency).toBe('USD')
    expect(switched.whatsappDefaultAccountId).toBeNull()
    expect((await ctx.prisma.profile.findUniqueOrThrow({ where: { id: other.profile.id } })).whatsappDefaultCurrency).toBeNull()
    expect(await waSay('Olvidá mis preferencias de pago')).toContain('borré')
    expect((await ctx.prisma.profile.findUniqueOrThrow({ where: { id: owner.profile.id } })).whatsappDefaultCurrency).toBeNull()
  })
  it('does not save an unknown account or infer payment preferences from ordinary expenses', async () => {
    expect(await appSay('Mi cuenta habitual es Cuenta inexistente')).toContain('No encontré')
    expect((await ctx.prisma.profile.findUniqueOrThrow({ where: { id: owner.profile.id } })).whatsappDefaultAccountId).toBeNull()
  })
})
