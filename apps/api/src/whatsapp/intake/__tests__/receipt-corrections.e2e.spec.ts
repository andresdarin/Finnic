import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { api, Edges, JPEG, makeUser, startApp, testDatabaseUrl, textMessage, webhook } from './e2e.harness'

const url = testDatabaseUrl()
describe.skipIf(!url)('Receipt correction: pending edits, explicit confirmation and idempotency', () => {
  const edges = new Edges()
  let ctx: Awaited<ReturnType<typeof startApp>>, owner: Awaited<ReturnType<typeof makeUser>>
  const appSay = async (message: string, photo = false, requestId = randomUUID()) => {
    const form = new FormData(); form.set('requestId', requestId); form.set('message', message)
    if (photo) { form.set('kind', 'image'); form.set('file', new Blob([new Uint8Array(JPEG)], { type: 'image/jpeg' }), 'ticket.jpg') }
    const response = await fetch(`${ctx.base}/ai/chat/intake`, { method: 'POST', headers: { Authorization: `Bearer ${owner.token}` }, body: form })
    expect(response.status).toBe(201); return (await response.json()).text as string
  }
  const waSay = async (text: string) => {
    expect(await webhook(ctx.base)(textMessage(owner.phone, text))).toBe(200)
    await ctx.worker.drain(); return edges.lastTo(owner.phone)
  }
  const count = () => ctx.prisma.personalExpense.count({ where: { profileId: owner.profile.id } })
  beforeAll(async () => {
    edges.install(); ctx = await startApp(url!); owner = await makeUser(ctx.prisma)
    await ctx.prisma.profile.update({ where: { id: owner.profile.id }, data: { whatsappPhone: `+${owner.phone}`, whatsappLinkedAt: new Date() } })
    await api(ctx.base, owner.token)('/finance/accounts', 'POST', { name: 'Efectivo', type: 'CASH', currency: 'UYU', initialBalance: '1000' })
  }, 60000)
  afterAll(async () => { if (ctx) { await ctx.prisma.profile.deleteMany({ where: { id: owner?.profile.id } }); await ctx.app.close() }; vi.restoreAllMocks() })
  it('edits price and quantity across app/WhatsApp, preserves products and saves exactly once', async () => {
    edges.receiptQueue.push({ isReceipt: true, merchant: 'Súper de prueba', currency: 'UYU', total: '220.00', confidence: 1, paymentMethod: 'CASH', items: [{ name: 'Café', quantity: 1, unitPrice: 100, totalPrice: 100 }, { name: 'Pan', quantity: 1, unitPrice: 50, totalPrice: 50 }] })
    expect(await appSay('', true)).toContain('Lo guardo?')
    expect(await waSay('El precio del café no es $ 100, es $ 120')).toContain('no coincide')
    // An early yes must not save or silently discard the explicitly corrected products.
    expect(await waSay('sí')).toContain('no coincide'); expect(await count()).toBe(0)
    const review = await appSay('Cambiá la cantidad de pan a 2')
    expect(review).toContain('Café × 1 — $U 120,00'); expect(review).toContain('Pan × 2 — $U 100,00')
    expect(review).toContain('Lo guardo?'); expect(await count()).toBe(0)
    const confirmation = textMessage(owner.phone, 'sí')
    expect(await webhook(ctx.base)(confirmation)).toBe(200); await ctx.worker.drain()
    expect(await webhook(ctx.base)(confirmation)).toBe(200); await ctx.worker.drain()
    expect(await count()).toBe(1)
    const expense = await ctx.prisma.personalExpense.findFirstOrThrow({ where: { profileId: owner.profile.id }, include: { items: true } })
    expect(expense.amount.toFixed(2)).toBe('220.00')
    expect(expense.items.map(item => [item.name, item.quantity?.toFixed(3), item.totalPrice.toFixed(2)])).toEqual([['Café', '1.000', '120.00'], ['Pan', '2.000', '100.00']])
    expect((await ctx.prisma.financeAccount.findFirstOrThrow({ where: { profileId: owner.profile.id } })).balance.toFixed(2)).toBe('780.00')
  })
})
