import { afterEach, describe, expect, it, vi } from 'vitest'
import { VoiceReplyService } from './voice-reply.service'

const config = { ELEVENLABS_ENABLED: 'true', ELEVENLABS_API_KEY: 'private-test-key', ELEVENLABS_TRIAL_PHONES: '+59898498532', ELEVENLABS_VOICE_ID: 'voice123' }
const client = { sendAudio: vi.fn().mockResolvedValue({ wamid: 'wamid.audio' }) }
const service = () => new VoiceReplyService({ get: (key: string) => config[key as keyof typeof config] } as never, client as never)
const reply = { from: '59898498532', body: 'En audio, cómo puedo ahorrar?', replyText: 'Separá una parte al cobrar y dejá margen para tus gastos.', intent: 'other', result: { voiceAllowed: true } }
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('personal voice trial', () => {
  it('requires an explicit request, approved number and short read-only answer', () => {
    expect(service().eligible(reply)).toBe(true)
    expect(service().eligible({ ...reply, body: 'hola' })).toBe(false)
    expect(service().eligible({ ...reply, from: '59811111111' })).toBe(false)
    expect(service().eligible({ ...reply, body: 'no me mandes audios' })).toBe(false)
    expect(service().eligible({ ...reply, body: 'no me respondas por audio' })).toBe(false)
    expect(service().eligible({ ...reply, replyText: 'x'.repeat(361) })).toBe(false)
    expect(service().eligible({ ...reply, intent: 'register_expense', result: {} })).toBe(false)
    expect(service().eligible({ ...reply, replyText: 'Lo guardo? Decime sí o no.' })).toBe(false)
  })
  it('uses the fixed speech endpoint and sends its audio to WhatsApp', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ 'content-type': 'audio/mpeg' }), arrayBuffer: async () => Buffer.from('ID3sample') })
    vi.stubGlobal('fetch', fetch)
    await service().send({ to: reply.from, phoneNumberId: 'phone', text: reply.replyText })
    expect(fetch.mock.calls[0]![0]).toContain('https://api.elevenlabs.io/v1/text-to-speech/voice123')
    expect(JSON.parse(fetch.mock.calls[0]![1].body)).toMatchObject({ text: reply.replyText, language_code: 'es' })
    expect(client.sendAudio).toHaveBeenCalledTimes(1)
  })
  it('falls back to the already sent text when quota or provider fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }))
    await expect(service().send({ to: reply.from, phoneNumberId: 'phone', text: reply.replyText })).resolves.toBeUndefined()
    expect(client.sendAudio).not.toHaveBeenCalled()
  })
})
