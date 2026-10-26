import { describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import { WhatsAppWebhookController } from '../whatsapp-webhook.controller'
import { WhatsAppWebhookService } from '../whatsapp-webhook.service'

const SECRET = 'test-app-secret'
const payload = (type = 'text', extra: Record<string, unknown> = {}) => ({
  object: 'whatsapp_business_account', entry: [{ changes: [{ value: {
    metadata: { phone_number_id: '123' }, contacts: [{ wa_id: '59899123456' }],
    messages: [{ id: 'wamid.xxx', from: '59899123456', timestamp: '1700000000', type,
      ...(type === 'text' ? { text: { body: 'Hola' } } : type === 'image' ? { image: { id: 'image-1', mime_type: 'image/jpeg', caption: 'súper' } } : {}), ...extra }],
  } }] }],
})
const signed = (body: unknown, secret = SECRET) => {
  const rawBody = Buffer.from(JSON.stringify(body))
  return { request: { rawBody, body }, signature: `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}` }
}
const response = () => ({ type: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis(), send: vi.fn() })
const config = (values: Record<string, string | undefined>) => ({ get: vi.fn((key: string) => values[key]) }) as unknown as ConfigService

function controller(values: Record<string, string | undefined> = { META_APP_SECRET: SECRET }) {
  const order: string[] = []
  const inbox = { enqueue: vi.fn(async (messages: unknown[]) => { order.push('enqueue'); return messages.length }) }
  const worker = { kick: vi.fn(async () => { order.push('kick') }) }
  return { inbox, worker, order, instance: new WhatsAppWebhookController(config(values), new WhatsAppWebhookService(), inbox as any, worker as any) }
}

describe('WhatsApp webhook', () => {
  it('preserves a sticker as its own media type, never as a receipt image', () => {
    const messages = new WhatsAppWebhookService().parseMetaPayload(payload('sticker', { sticker: { id: 'sticker-1', mime_type: 'image/webp', sha256: 'hash', animated: true } }))
    expect(messages[0]).toMatchObject({ type: 'sticker', text: '', media: { id: 'sticker-1', mimeType: 'image/webp', sha256: 'hash' } })
  })
  it('devuelve el challenge para una verificación correcta', () => {
    const res = response()
    controller({ META_WEBHOOK_VERIFY_TOKEN: 'valid-token' }).instance.verify({ 'hub.mode': 'subscribe', 'hub.verify_token': 'valid-token', 'hub.challenge': 'challenge-1' }, res)
    expect(res.send).toHaveBeenCalledWith('challenge-1')
  })

  it('rechaza un token incorrecto o sin configurar con 403', () => {
    const res = response()
    controller({ META_WEBHOOK_VERIFY_TOKEN: 'valid-token' }).instance.verify({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong' }, res)
    expect(res.status).toHaveBeenCalledWith(403)
    const unset = response()
    controller({}).instance.verify({ 'hub.mode': 'subscribe', 'hub.verify_token': '' }, unset)
    expect(unset.status).toHaveBeenCalledWith(403)
  })

  it('rechaza firmas inválidas sin persistir nada', async () => {
    const c = controller()
    const { request } = signed(payload())
    const res = response()
    await c.instance.receive(request, `sha256=${'0'.repeat(64)}`, res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(c.inbox.enqueue).not.toHaveBeenCalled()
  })

  it('falla cerrado si META_APP_SECRET no está configurado', async () => {
    const c = controller({})
    const { request, signature } = signed(payload())
    const res = response()
    await c.instance.receive(request, signature, res)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(c.inbox.enqueue).not.toHaveBeenCalled()
  })

  it('persiste antes de responder 200 y luego dispara el worker', async () => {
    const c = controller()
    const { request, signature } = signed(payload())
    const res = response()
    res.status.mockImplementation(() => { c.order.push('ack'); return res })
    await c.instance.receive(request, signature, res)
    expect(c.order).toEqual(['enqueue', 'ack', 'kick'])
  })

  it('responde 500 si no pudo persistir, para que Meta reintente', async () => {
    const c = controller()
    c.inbox.enqueue.mockRejectedValueOnce(new Error('db down'))
    const { request, signature } = signed(payload())
    const res = response()
    await c.instance.receive(request, signature, res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(c.worker.kick).not.toHaveBeenCalled()
  })

  it('normaliza texto, imagen con caption, mensaje citado y tipos no soportados', () => {
    const service = new WhatsAppWebhookService()
    expect(service.parseMetaPayload(payload())[0]).toMatchObject({ wamid: 'wamid.xxx', from: '59899123456', phoneNumberId: '123', type: 'text', text: 'Hola' })
    expect(service.parseMetaPayload(payload('image'))[0]).toMatchObject({ type: 'image', text: 'súper', media: { id: 'image-1', mimeType: 'image/jpeg' } })
    expect(service.parseMetaPayload(payload('text', { context: { id: 'wamid.reply' } }))[0]?.contextWamid).toBe('wamid.reply')
    expect(service.parseMetaPayload(payload('audio'))[0]?.type).toBe('unsupported')
    expect(service.parseMetaPayload({ object: 'whatsapp_business_account', entry: [{ changes: [{ value: { metadata: { phone_number_id: '1' }, statuses: [{}] } }] }] })).toEqual([])
  })

  it('verifica la firma HMAC en tiempo constante sobre el cuerpo exacto', () => {
    const service = new WhatsAppWebhookService()
    const { request, signature } = signed(payload())
    expect(service.verifySignature(request.rawBody, signature, SECRET)).toBe(true)
    expect(service.verifySignature(Buffer.from(JSON.stringify(payload()) + ' '), signature, SECRET)).toBe(false)
    expect(service.verifySignature(request.rawBody, signature, 'other-secret')).toBe(false)
    expect(service.verifySignature(request.rawBody, undefined, SECRET)).toBe(false)
  })
})
