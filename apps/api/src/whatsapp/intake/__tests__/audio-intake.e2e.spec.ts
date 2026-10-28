import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { latencySummary } from '../inbox/latency-summary'
import { GeminiClient } from '../../../ai/client/gemini.client'
import { WhatsAppClient } from '../../whatsapp-client.service'
import { Edges, makeUser, startApp, testDatabaseUrl, textMessage, webhook } from './e2e.harness'

const url = testDatabaseUrl()
describe.skipIf(!url)('Voice note through signed webhook and worker', () => {
  let ctx: Awaited<ReturnType<typeof startApp>>, user: Awaited<ReturnType<typeof makeUser>>
  const edges = new Edges()
  let transcript = 'Gasté 850 pesos en supermercado sin cuenta'
  const count = () => ctx.prisma.personalExpense.count({ where: { profileId: user.profile.id } })
  const runId = randomUUID()
  const voice = (id: string) => ({ id: `${id}.${runId}`, from: user.phone, type: 'audio', audio: { id: 'voice-media', mime_type: 'audio/ogg; codecs=opus' } })
  const send = async (message: Record<string, unknown>) => { expect(await webhook(ctx.base)(message)).toBe(200); await ctx.worker.drain(); return edges.lastTo(user.phone) }
  beforeAll(async () => {
    edges.install(); ctx = await startApp(url!); user = await makeUser(ctx.prisma)
    await ctx.prisma.profile.update({ where: { id: user.profile.id }, data: { whatsappPhone: `+${user.phone}`, whatsappLinkedAt: new Date(), whatsappDefaultCurrency: 'UYU' } })
    vi.spyOn(WhatsAppClient.prototype, 'downloadMedia').mockResolvedValue({ bytes: Buffer.from('OggSvoice-test'), mimeType: 'audio/ogg', sha256: 'test-hash' })
    vi.spyOn(GeminiClient.prototype, 'generateContent').mockImplementation(async options => {
      if (options.contents?.[0]?.parts.some(p => p.inlineData)) return JSON.stringify({ clear: !!transcript, transcript: transcript || null })
      return JSON.stringify({ intent: 'register_expense', amount: '850', currency: 'UYU', title: 'Supermercado', category: 'supermercado' })
    })
  }, 60000)
  afterAll(async () => {
    if (user) {
      const rows = await ctx.prisma.whatsAppInboundMessage.findMany({ where: { from: user.phone } })
      const folder = resolve('../../tmp/whatsapp-setup'); await mkdir(folder, { recursive: true })
      await writeFile(resolve(folder, 'audio-local-latency.json'), JSON.stringify({ environment: 'Local HTTP + PostgreSQL; Meta/Gemini mocked, not production model latency', ...latencySummary(rows) }, null, 2))
      await ctx.prisma.profile.delete({ where: { id: user.profile.id } })
    }
    await ctx?.app.close(); vi.restoreAllMocks()
  })
  it('checks database readiness through HTTP without returning personal records', async () => {
    const response = await fetch(`${ctx.base}/health/database`)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok', database: 'ok', durationMs: expect.any(Number), uptimeSeconds: expect.any(Number) })
  })
  it('proposes a voice expense, requires written confirmation, and deduplicates delivery', async () => {
    const message = voice('wamid.voice-expense')
    const reply = await send(message)
    expect(reply).toContain('850,00'); expect(reply).toContain('por escrito')
    expect(await count()).toBe(0)
    transcript = 'sí'
    expect(await send(voice('wamid.voice-yes'))).toContain('por escrito')
    expect(await count()).toBe(0)
    await send(textMessage(user.phone, 'sí'))
    expect(await count()).toBe(1)
    await send(message)
    expect(await count()).toBe(1)
  })
  it('does not guess or register unclear audio', async () => {
    transcript = ''
    expect(await send(voice('wamid.voice-unclear'))).toContain('No entendí bien')
    expect(await count()).toBe(1)
  })
  it('applies financial scope to a spoken recipe request', async () => {
    transcript = 'Cómo se hace una torta de papas?'
    expect(await send(voice('wamid.voice-recipe'))).toContain('Con la receta no te puedo ayudar')
    expect(await count()).toBe(1)
  })
  it('answers a spoken financial query from the same recorded movements', async () => {
    transcript = 'Cuánto gasté este mes?'
    expect(await send(voice('wamid.voice-query'))).toContain('850,00')
    expect(await count()).toBe(1)
  })
  it('never offers cash or debit for a spoken credit payment without a card', async () => {
    transcript = 'Gasté 850 pesos en supermercado con crédito'
    const reply = await send(voice('wamid.voice-credit'))
    expect(reply).toContain('tarjeta de crédito')
    expect(reply).not.toContain('1) Efectivo')
    expect(await count()).toBe(1)
  })
})
