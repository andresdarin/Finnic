import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { Logger } from '@nestjs/common'
import { WhatsAppClient } from '../whatsapp-client.service'

const token = 'secret-access-token'
const client = () => new WhatsAppClient({ get: vi.fn((key: string) => key === 'WHATSAPP_ACCESS_TOKEN' ? token : undefined) } as any)
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)])
const limits = { maxBytes: 1024, allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] }
const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body, headers: new Headers() })
const file = (bytes: Buffer, length = bytes.length) => ({ ok: true, status: 200, headers: new Headers({ 'content-length': String(length) }), arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) })

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('WhatsAppClient', () => {
  it('uploads an MP3 and sends it as WhatsApp audio', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ id: '12345' })).mockResolvedValueOnce(json({ messages: [{ id: 'wamid.audio' }] }))
    vi.stubGlobal('fetch', fetch)
    await expect(client().sendAudio({ to: '59899123456', phoneNumberId: '123', bytes: Buffer.from('ID3sample') })).resolves.toEqual({ wamid: 'wamid.audio' })
    expect(fetch.mock.calls[0]![1].body).toBeInstanceOf(FormData)
    expect(JSON.parse(fetch.mock.calls[1]![1].body)).toMatchObject({ type: 'audio', audio: { id: '12345' } })
  })
  it('marks the inbound message read and requests the native typing indicator', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ success: true }))
    vi.stubGlobal('fetch', fetch)
    await client().showTyping({ phoneNumberId: '123', messageId: 'wamid.in' })
    expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual({ messaging_product: 'whatsapp', status: 'read', message_id: 'wamid.in', typing_indicator: { type: 'text' } })
  })
  it('uploads a private WebP and sends it with the native sticker type', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ id: '12345' })).mockResolvedValueOnce(json({ messages: [{ id: 'wamid.sticker' }] }))
    vi.stubGlobal('fetch', fetch)
    const bytes = Buffer.from('524946461000000057454250565038200000000000000000', 'hex')
    await expect(client().sendSticker({ to: '59899123456', phoneNumberId: '123', bytes })).resolves.toEqual({ wamid: 'wamid.sticker' })
    expect(fetch.mock.calls[0]![1].body).toBeInstanceOf(FormData)
    expect(JSON.parse(fetch.mock.calls[1]![1].body)).toMatchObject({ type: 'sticker', sticker: { id: '12345' } })
  })
  it('no expone el access token en errores ni logs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, text: async () => `failed ${token}` })))
    const logs = [vi.spyOn(console, 'error').mockImplementation(() => undefined), vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)]
    await expect(client().sendText({ to: '59899123456', body: 'Hola', phoneNumberId: '123' })).rejects.toThrow('WhatsApp no disponible')
    expect(logs.flatMap(log => log.mock.calls.flat()).map(value => JSON.stringify(value)).join(' ')).not.toContain(token)
  })

  it('devuelve el wamid saliente para poder resolver respuestas citadas', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ messages: [{ id: 'wamid.out' }] })))
    await expect(client().sendText({ to: '59899123456', body: 'Hola', phoneNumberId: '123' })).resolves.toEqual({ wamid: 'wamid.out' })
  })

  it('descarga el adjunto en dos pasos autenticados y valida hash', async () => {
    const sha256 = createHash('sha256').update(JPEG).digest('hex')
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ url: 'https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1/x', mime_type: 'image/jpeg', file_size: JPEG.length, sha256 }))
      .mockResolvedValueOnce(file(JPEG))
    vi.stubGlobal('fetch', fetch)
    const media = await client().downloadMedia('media-1', limits)
    expect(media).toMatchObject({ mimeType: 'image/jpeg', sha256 })
    for (const call of fetch.mock.calls) expect(call[1].headers.Authorization).toBe(`Bearer ${token}`)
  })

  it('rechaza tipos no permitidos, archivos grandes, contenido falso y hosts ajenos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({ url: 'https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1/x', mime_type: 'application/pdf' })))
    await expect(client().downloadMedia('m', limits)).rejects.toThrow('UNSUPPORTED_MEDIA_TYPE')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({ url: 'https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1/x', mime_type: 'image/jpeg', file_size: 5000 })))
    await expect(client().downloadMedia('m', limits)).rejects.toThrow('MEDIA_TOO_LARGE')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({ url: 'https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1/x', mime_type: 'image/jpeg' })).mockResolvedValueOnce(file(Buffer.from('<svg>evil</svg>'))))
    await expect(client().downloadMedia('m', limits)).rejects.toThrow('UNSUPPORTED_MEDIA_TYPE')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({ url: 'https://attacker.example/x', mime_type: 'image/jpeg' })))
    await expect(client().downloadMedia('m', limits)).rejects.toThrow('no devolvió el adjunto')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({ url: 'https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1/x', mime_type: 'image/jpeg', sha256: 'f'.repeat(64) })).mockResolvedValueOnce(file(JPEG)))
    await expect(client().downloadMedia('m', limits)).rejects.toThrow('MEDIA_INTEGRITY')
  })
})
