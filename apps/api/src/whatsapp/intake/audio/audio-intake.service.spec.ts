import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { AudioIntakeService } from './audio-intake.service'
import type { InboundContext } from '../types'
import { matchesMagic } from '../../whatsapp-client.service'

const context = { inboundId: 'voice', media: { id: 'media' } } as InboundContext
const make = (raw = '{"clear":true,"transcript":"Gasté 850 pesos"}') => {
  const client = { downloadMedia: vi.fn(async () => ({ bytes: Buffer.from('OggSvoice'), mimeType: 'audio/ogg', sha256: 'hash' })) }
  const gemini = { generateContent: vi.fn(async () => raw) }
  const prisma = { whatsAppInboundMessage: { update: vi.fn() } }
  return { client, gemini, service: new AudioIntakeService(client as never, gemini as never, prisma as never) }
}
describe('audio input validation', () => {
  it('passes authenticated media to Gemini as audio and returns a literal transcript', async () => {
    const { service, client, gemini } = make()
    expect(await service.transcribe(context)).toEqual({ text: 'Gasté 850 pesos' })
    expect(client.downloadMedia).toHaveBeenCalledWith('media', expect.objectContaining({ maxBytes: 6 * 1024 * 1024 }))
    expect(gemini.generateContent).toHaveBeenCalledWith(expect.objectContaining({ contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'audio/ogg', data: Buffer.from('OggSvoice').toString('base64') } }] }] }))
  })
  it.each(['{"clear":false,"transcript":null}', 'not json', JSON.stringify({ clear: true, transcript: 'x'.repeat(1501) })])('does not route unclear or invalid transcription', async raw => {
    const result = await make(raw).service.transcribe(context)
    expect(result).toHaveProperty('reply'); expect(result).not.toHaveProperty('text')
  })
  it('rejects bad media before sending anything to Gemini', async () => {
    const { service, client, gemini } = make()
    client.downloadMedia.mockRejectedValueOnce(new BadRequestException('MEDIA_TOO_LARGE'))
    expect(await service.transcribe(context)).toHaveProperty('reply')
    expect(gemini.generateContent).not.toHaveBeenCalled()
  })
  it('validates actual audio container signatures instead of trusting a filename', () => {
    expect(matchesMagic(Buffer.from('OggSvoice'), 'audio/ogg')).toBe(true)
    expect(matchesMagic(Buffer.from('<html>'), 'audio/ogg')).toBe(false)
    expect(matchesMagic(Buffer.from('RIFF0000WAVE'), 'audio/wav')).toBe(true)
    expect(matchesMagic(Buffer.from('RIFF0000WEBP'), 'audio/wav')).toBe(false)
  })
})
