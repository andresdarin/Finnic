import { createHash, randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { WhatsAppClient } from '../../whatsapp-client.service'
import { api, Edges, JPEG, makeUser, startApp, testDatabaseUrl, textMessage, webhook } from './e2e.harness'

const url = testDatabaseUrl()
describe.skipIf(!url)('Financial PDF and transfer proof: real HTTP, worker and PostgreSQL', () => {
  const edges = new Edges()
  let ctx: Awaited<ReturnType<typeof startApp>>, user: Awaited<ReturnType<typeof makeUser>>, accountId: string
  let file: Buffer
  const document = () => ({ id: `wamid.${randomUUID()}`, from: user.phone, type: 'document', document: { id: 'pdf-media', mime_type: 'application/pdf' } })
  const send = async (message: Record<string, unknown>) => { expect(await webhook(ctx.base)(message)).toBe(200); await ctx.worker.drain(); return edges.lastTo(user.phone) }
  const say = (text: string) => send(textMessage(user.phone, text))
  const rows = () => ctx.prisma.personalExpense.findMany({ where: { profileId: user.profile.id } })
  const balance = async () => (await ctx.prisma.financeAccount.findUniqueOrThrow({ where: { id: accountId } })).balance.toFixed(2)
  const proof = (extra: Record<string, unknown> = {}) => ({ documentKind: 'transfer', isReceipt: false, total: '1250.00', currency: 'UYU', date: '2026-10-27', confidence: .99, items: [], movementCount: 1, ...extra })
  const queue = (reading: Record<string, unknown>) => { file = Buffer.from(`%PDF-1.4\n${randomUUID()}`); edges.receiptQueue.push(reading) }
  beforeAll(async () => {
    edges.install(); ctx = await startApp(url!); user = await makeUser(ctx.prisma)
    await ctx.prisma.profile.update({ where: { id: user.profile.id }, data: { whatsappPhone: `+${user.phone}`, whatsappLinkedAt: new Date(), whatsappDefaultCurrency: 'UYU' } })
    accountId = (await api(ctx.base, user.token)('/finance/accounts', 'POST', { name: 'Banco de prueba', type: 'BANK', currency: 'UYU', initialBalance: '10000' })).body.id
    vi.spyOn(WhatsAppClient.prototype, 'downloadMedia').mockImplementation(async () => ({ bytes: file, mimeType: 'application/pdf', sha256: createHash('sha256').update(file).digest('hex') }))
  }, 60000)
  afterAll(async () => { if (user) await ctx.prisma.profile.delete({ where: { id: user.profile.id } }); await ctx?.app.close(); vi.restoreAllMocks() })
  it('asks direction and saves a received proof as one income only after confirmation', async () => {
    queue(proof())
    const message = document()
    expect(await send(message)).toContain('ingreso, egreso')
    expect(await rows()).toHaveLength(0)
    expect(await say('ingreso')).toContain('Ingreso de $U 1.250,00')
    expect(await balance()).toBe('10000.00')
    expect(await say('sí')).toContain('un ingreso de')
    expect((await rows())[0].movementType).toBe('INCOME')
    expect(await balance()).toBe('11250.00')
    await send(message)
    expect(await rows()).toHaveLength(1); expect(await balance()).toBe('11250.00')
  })
  it('warns on the same file resent under another message id and allows cancellation', async () => {
    edges.receiptQueue.push(proof()) // keep exactly the same bytes/hash as the first proof
    await send(document())
    expect(await say('ingreso')).toContain('parece igual')
    await say('no')
    expect(await rows()).toHaveLength(1); expect(await balance()).toBe('11250.00')
  })
  it('records an outgoing proof as expense and subtracts the selected bank balance', async () => {
    queue(proof({ total: '350.00' }))
    await send(document())
    expect(await say('egreso')).toContain('Egreso de $U 350,00')
    expect(await balance()).toBe('11250.00')
    await say('sí')
    expect((await rows()).filter(r => r.movementType === 'EXPENSE')).toHaveLength(1)
    expect(await balance()).toBe('10900.00')
  })
  it('does not misclassify own-account transfers or guess missing currency/date', async () => {
    queue(proof({ currency: null, date: null }))
    await send(document())
    expect(await say('ingreso')).toMatch(/pesos|dólares/)
    await say('cancelar')
    queue(proof())
    await send(document())
    expect(await say('entre mis cuentas')).toContain('no es ingreso ni gasto')
    expect(await rows()).toHaveLength(2)
  })
  it('answers financial PDF questions without recording and rejects bulk transfer totals', async () => {
    queue({ documentKind: 'financial', isReceipt: false, summary: 'La comisión indicada es de $U 50.', items: [] })
    expect(await send(document())).toContain('comisión')
    queue(proof({ movementCount: 3, total: null }))
    expect(await send(document())).toContain('varios movimientos')
    expect(await rows()).toHaveLength(2)
  })
  it('never records a scheduled or rejected transfer as received or paid', async () => {
    for (const paymentStatus of ['pending', 'failed']) {
      queue(proof({ paymentStatus }))
      expect(await send(document())).toContain('No la registré')
    }
    expect(await rows()).toHaveLength(2)
  })
  it('accepts a PDF ticket through app chat, preserves products and requires confirmation', async () => {
    queue({ documentKind: 'receipt', isReceipt: true, total: '100.00', currency: 'UYU', date: '2026-10-27', merchant: 'Tienda de prueba', confidence: .99, items: [{ name: 'Producto PDF', quantity: 2, unitPrice: 50, totalPrice: 100 }] })
    const form = new FormData(); form.set('requestId', randomUUID()); form.set('file', new Blob([new Uint8Array(file)], { type: 'application/pdf' }), 'ticket.pdf')
    const response = await fetch(ctx.base+'/ai/chat/intake', { method: 'POST', headers: { Authorization: `Bearer ${user.token}` }, body: form })
    expect(response.status).toBe(201); expect((await response.json()).text).toContain('cuenta')
    expect(await say('Banco de prueba')).toContain('Producto PDF')
    expect(await rows()).toHaveLength(2)
    await say('sí')
    expect(await rows()).toHaveLength(3)
  })
  it('rejects a fake PDF before extraction and keeps unrelated documents out of the ledger', async () => {
    const form = new FormData(); form.set('requestId', randomUUID()); form.set('file', new Blob(['<html>not a PDF</html>'], { type: 'application/pdf' }), 'fake.pdf')
    expect((await fetch(ctx.base+'/ai/chat/intake', { method: 'POST', headers: { Authorization: `Bearer ${user.token}` }, body: form })).status).toBe(400)
    queue({ documentKind: 'unrelated', isReceipt: false, items: [] })
    expect(await send(document())).toContain('No guardé nada')
    expect(await rows()).toHaveLength(3)
  })
  it('recognizes a photographed transfer proof and preserves its app/image origin', async () => {
    edges.receiptQueue.push(proof({ total: '200.00' }))
    const form = new FormData(); form.set('requestId', randomUUID()); form.set('file', new Blob([new Uint8Array(JPEG)], { type: 'image/jpeg' }), 'transfer.jpg')
    const response = await fetch(ctx.base+'/ai/chat/intake', { method: 'POST', headers: { Authorization: `Bearer ${user.token}` }, body: form })
    expect(response.status).toBe(201); expect((await response.json()).text).toContain('ingreso, egreso')
    await say('ingreso'); await say('sí')
    const income = (await rows()).find(r => r.movementType === 'INCOME' && r.amount.toFixed(2) === '200.00')
    expect(income).toMatchObject({ source: 'web', inputMethod: 'RECEIPT_SCAN' })
    expect(await balance()).toBe('11000.00')
  })
})
