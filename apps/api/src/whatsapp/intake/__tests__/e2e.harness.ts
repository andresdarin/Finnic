import { createHmac, randomUUID } from 'node:crypto'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import jwt from 'jsonwebtoken'
import { vi } from 'vitest'
import { GeminiClient } from '../../../ai/client/gemini.client'
import { WhatsAppClient } from '../../whatsapp-client.service'
import { PrismaService } from '../../../prisma/prisma.service'
import { WhatsAppWorker } from '../inbox/whatsapp-worker.service'

export const APP_SECRET = 'e2e-meta-app-secret'
const JWT_SECRET = 'e2e-supabase-jwt-secret'
export const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(randomUUID())])

export const testDatabaseUrl = () => {
  const url = process.env.TRANQUILITY_TEST_DATABASE_URL
  const parsed = url ? new URL(url) : null
  const enabled = Boolean(parsed && parsed.protocol === 'postgresql:' && parsed.hostname === '127.0.0.1' && parsed.pathname.slice(1).startsWith('tranquility_'))
  if (url && !enabled) throw new Error('TRANQUILITY_TEST_DATABASE_URL must target 127.0.0.1 and a tranquility_ database')
  return enabled ? url! : null
}

/** External edges only: Gemini answers from a script and Meta's Graph API is recorded. */
export class Edges {
  sent: Array<{ to: string; body: string }> = []
  stickersSent: Array<{ to: string; bytes: Buffer }> = []
  failNextSends = 0
  failNextDownloads = 0
  textReplies: Array<{ match: RegExp; json: Record<string, unknown> }> = []
  receiptQueue: Array<Record<string, unknown>> = []
  geminiDown = false

  install() {
    vi.spyOn(WhatsAppClient.prototype, 'sendSticker').mockImplementation(async ({ to, bytes }) => {
      this.stickersSent.push({ to, bytes }); return { wamid: `wamid.sticker.${randomUUID()}` }
    })
    vi.spyOn(GeminiClient.prototype, 'generateContent').mockImplementation(async (opts: any) => {
      if (this.geminiDown) throw new Error('Gemini no disponible temporalmente')
      const parts = opts.contents?.[0]?.parts ?? []
      if (parts.some((part: any) => part.inlineData)) return JSON.stringify(this.receiptQueue.shift() ?? { isReceipt: false })
      const text = String(parts[0]?.text ?? '')
      return JSON.stringify(this.textReplies.find(reply => reply.match.test(text))?.json ?? { intent: 'other' })
    })
    vi.spyOn(WhatsAppClient.prototype, 'sendText').mockImplementation(async ({ to, body }) => {
      if (this.failNextSends > 0) { this.failNextSends--; throw new Error('Meta 503') }
      this.sent.push({ to, body })
      return { wamid: `wamid.out.${this.sent.length}.${randomUUID()}` }
    })
    vi.spyOn(WhatsAppClient.prototype, 'downloadMedia').mockImplementation(async () => {
      if (this.failNextDownloads > 0) { this.failNextDownloads--; throw new Error('Meta media 503') }
      return { bytes: JPEG, mimeType: 'image/jpeg', sha256: 'sha-of-ticket-1' }
    })
  }
  lastTo(phone: string) { return [...this.sent].reverse().find(row => row.to === phone)?.body ?? '' }
}

export async function startApp(url: string) {
  Object.assign(process.env, {
    DATABASE_URL: url, DIRECT_URL: url, META_APP_SECRET: APP_SECRET, SUPABASE_JWT_SECRET: JWT_SECRET,
    WHATSAPP_WORKER_DISABLED: 'true', WHATSAPP_ACCESS_TOKEN: 'e2e-token', GEMINI_API_KEY: 'e2e-key', AI_ENV: 'TEST',
  })
  const { AppModule } = await import('../../../app.module')
  const app = await NestFactory.create(AppModule, { rawBody: true, logger: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  const prisma = app.get(PrismaService)
  // Hard stop if the app is not connected to the isolated test database.
  const [db] = await prisma.$queryRaw<Array<{ name: string; host: string }>>`SELECT current_database() AS name, inet_server_addr()::text AS host`
  if (!db?.name.startsWith('tranquility_') || !String(db.host).startsWith('127.0.0.1')) throw new Error(`Refusing to run against ${db?.name}`)
  return { app, prisma, worker: app.get(WhatsAppWorker), base: `${await app.getUrl()}/api` }
}

export function api(base: string, token: string) {
  return async (path: string, method = 'GET', body?: unknown) => {
    const response = await fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    const text = await response.text()
    return { status: response.status, body: text ? JSON.parse(text) : null }
  }
}

export async function makeUser(prisma: PrismaService) {
  const authUserId = `e2e-${randomUUID()}`
  const profile = await prisma.profile.create({ data: { authUserId, email: `${authUserId}@e2e.test`, timeZone: 'America/Montevideo' } })
  const token = jwt.sign({ sub: authUserId, email: profile.email, role: 'authenticated' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' })
  return { profile, token, phone: `5989${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}` }
}

export function webhook(base: string) {
  return async (message: Record<string, unknown>, secret = APP_SECRET) => {
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: 'pnid-e2e' }, messages: [{ timestamp: String(Math.floor(Date.now() / 1000)), ...message }] } }] }] })
    const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
    return (await fetch(`${base}/webhooks/whatsapp`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signature }, body })).status
  }
}

export const textMessage = (from: string, body: string, extra: Record<string, unknown> = {}) => ({ id: `wamid.${randomUUID()}`, from, type: 'text', text: { body }, ...extra })
export const imageMessage = (from: string, caption = '') => ({ id: `wamid.${randomUUID()}`, from, type: 'image', image: { id: `media${randomUUID().replace(/-/g, '')}`, mime_type: 'image/jpeg', caption } })
