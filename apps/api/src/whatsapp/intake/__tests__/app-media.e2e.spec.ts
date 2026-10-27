import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { api, Edges, JPEG, makeUser, startApp, testDatabaseUrl, webhook } from './e2e.harness'
import { StyleMemoryService } from '../../../ai/personality/style-memory.service'

const url = testDatabaseUrl()
const WEBP = Buffer.from('524946461000000057454250565038200000000000000000', 'hex')

describe.skipIf(!url)('App chat media, ownership and receipt confirmation', () => {
  const edges = new Edges()
  let ctx: Awaited<ReturnType<typeof startApp>>
  let owner: Awaited<ReturnType<typeof makeUser>>, other: Awaited<ReturnType<typeof makeUser>>
  let conversationId: string
  const request = async (input: { type?: string; file?: Buffer; mime?: string; message?: string; requestId?: string; token?: string; conversation?: string }) => {
    const form = new FormData()
    form.set('requestId', input.requestId ?? randomUUID())
    form.set('conversationId', input.conversation ?? conversationId)
    form.set('message', input.message ?? '')
    if (input.file) { form.set('kind', input.type ?? 'image'); form.set('file', new Blob([new Uint8Array(input.file)], { type: input.mime ?? 'image/webp' }), 'media.webp') }
    const response = await fetch(`${ctx.base}/ai/chat/intake`, { method: 'POST', headers: { Authorization: `Bearer ${input.token ?? owner.token}` }, body: form })
    return { status: response.status, body: await response.json() }
  }
  beforeAll(async () => {
    edges.install(); ctx = await startApp(url!)
    owner = await makeUser(ctx.prisma); other = await makeUser(ctx.prisma)
    const conversation = await ctx.prisma.aiConversation.create({ data: { profileId: owner.profile.id, title: 'Media test' } })
    conversationId = conversation.id
    await api(ctx.base, owner.token)('/finance/accounts', 'POST', { name: 'Efectivo', type: 'CASH', currency: 'UYU', initialBalance: '1000' })
  }, 60_000)
  afterAll(async () => {
    for (const user of [owner, other]) if (user) await ctx.prisma.profile.delete({ where: { id: user.profile.id } })
    await ctx?.app.close(); vi.restoreAllMocks()
  })
  it('persists a sticker privately and makes duplicate requests idempotent', async () => {
    const requestId = randomUUID()
    expect((await request({ type: 'sticker', file: WEBP, requestId })).status).toBe(201)
    expect((await request({ type: 'sticker', file: WEBP, requestId })).status).toBe(201)
    const messages = await ctx.prisma.aiMessage.findMany({ where: { conversationId } })
    expect(messages).toHaveLength(2)
    expect(messages.find(message => message.role === 'USER')?.metadata).toMatchObject({ attachment: { kind: 'sticker', dataUrl: `data:image/webp;base64,${WEBP.toString('base64')}` } })
    expect(await ctx.prisma.personalExpense.count({ where: { profileId: owner.profile.id } })).toBe(0)
  })
  it('rejects disguised media and another profile accessing the conversation', async () => {
    expect((await request({ type: 'sticker', file: Buffer.from('<svg/>') })).status).toBe(400)
    expect((await request({ type: 'sticker', file: WEBP, token: other.token })).status).toBe(403)
    expect((await request({ type: 'sticker', file: WEBP, token: 'invalid' })).status).toBe(401)
  })
  it('reviews app receipt products, ignores stickers as confirmation, then saves once on yes', async () => {
    edges.receiptQueue.push({ isReceipt: true, merchant: 'Test tienda', currency: 'UYU', total: '25', confidence: 1, paymentMethod: 'CASH', items: [{ name: 'Pan', quantity: 1, unitPrice: 25, totalPrice: 25 }] })
    const review = await request({ file: JPEG, mime: 'image/jpeg' })
    expect(review.status).toBe(201); expect(review.body.text).toContain('Pan')
    expect(review.body.text).toContain('Lo guardo?')
    await request({ type: 'sticker', file: WEBP })
    expect(await ctx.prisma.personalExpense.count({ where: { profileId: owner.profile.id } })).toBe(0)
    const requestId = randomUUID()
    expect((await request({ message: 'sí', requestId })).body.text).toContain('Listo, anoté')
    await request({ message: 'sí', requestId })
    expect(await ctx.prisma.personalExpense.count({ where: { profileId: owner.profile.id } })).toBe(1)
  })
  it('mirrors an incoming WhatsApp sticker to authenticated app history without treating it as a ticket', async () => {
    await ctx.prisma.profile.update({ where: { id: other.profile.id }, data: { whatsappPhone: `+${other.phone}`, whatsappLinkedAt: new Date() } })
    vi.mocked((await import('../../whatsapp-client.service')).WhatsAppClient.prototype.downloadMedia).mockResolvedValueOnce({ bytes: WEBP, mimeType: 'image/webp', sha256: 'sticker-sha' })
    await webhook(ctx.base)({ id: `wamid.${randomUUID()}`, from: other.phone, type: 'sticker', sticker: { id: 'sticker-1', mime_type: 'image/webp' } })
    await ctx.worker.drain()
    const conversation = await ctx.prisma.aiConversation.findFirstOrThrow({ where: { profileId: other.profile.id, channel: 'whatsapp' }, include: { messages: true } })
    expect(conversation.messages).toHaveLength(2)
    expect(conversation.messages.find(message => message.role === 'USER')?.metadata).toMatchObject({ attachment: { kind: 'sticker' } })
    expect(edges.lastTo(other.phone)).toContain('Te leo')
  })
  it('sends its own sticker in the app and through Meta without creating an expense', async () => {
    const before = await ctx.prisma.personalExpense.count({ where: { profileId: owner.profile.id } })
    expect((await request({ message: 'Mandame un sticker' })).status).toBe(201)
    const message = await ctx.prisma.aiMessage.findFirstOrThrow({ where: { conversationId, role: 'ASSISTANT' }, orderBy: { createdAt: 'desc' } })
    expect(message.metadata).toMatchObject({ attachment: { kind: 'sticker', stickerId: 'finnic' } })
    await webhook(ctx.base)({ id: `wamid.${randomUUID()}`, from: other.phone, type: 'text', text: { body: 'Mandame un sticker' } })
    await ctx.worker.drain()
    expect(edges.stickersSent.some(sticker => sticker.to === other.phone && sticker.bytes.length < 100 * 1024)).toBe(true)
    expect(await ctx.prisma.personalExpense.count({ where: { profileId: owner.profile.id } })).toBe(before)
  })
  it('keeps learned style private to its profile across conversations and resets previous inference', async () => {
    const memory = ctx.app.get(StyleMemoryService)
    await memory.instruction(owner.profile.id, conversationId, 'Respondeme con detalle, usá emojis')
    const second = await ctx.prisma.aiConversation.create({ data: { profileId: owner.profile.id, title: 'Otra charla' } })
    expect(await memory.instruction(owner.profile.id, second.id, 'hola')).toContain('explicaciones con detalle útil')
    const otherConversation = await ctx.prisma.aiConversation.findFirstOrThrow({ where: { profileId: other.profile.id } })
    const otherStyle = await memory.instruction(other.profile.id, otherConversation.id, 'hola')
    expect(otherStyle).toContain('breve y al grano')
    expect(otherStyle).toContain('no usar')
    const reset = await memory.instruction(owner.profile.id, second.id, 'Olvidá mi estilo')
    expect(reset).toContain('breve y al grano')
    expect(reset).toContain('no usar')
  })
})
