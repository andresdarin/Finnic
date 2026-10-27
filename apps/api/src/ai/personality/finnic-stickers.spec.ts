import { describe, expect, it, vi } from 'vitest'
import { FinnicStickersService, isFinnicSticker } from './finnic-stickers.service'

const setup = (pending = false, recentSticker = false) => new FinnicStickersService({
  whatsAppExpenseDraft: { count: vi.fn(async () => pending ? 1 : 0) },
  aiPendingAction: { count: vi.fn(async () => 0) },
  aiMessage: { findFirst: vi.fn(async () => null), findMany: vi.fn(async () => recentSticker ? [{ metadata: { attachment: { kind: 'sticker' } } }] : []) },
} as never)

describe('Finnic sticker selection', () => {
  it('uses stickers for light conversation with a cooldown, never serious financial context', async () => {
    expect(await setup().select('p', 'Gracias Finnic!')).toBe('gracias')
    expect(await setup().select('p', 'Gracias, pero no puedo pagar la deuda')).toBeNull()
    expect(await setup(true).select('p', 'Gracias!')).toBeNull()
    expect(await setup(false, true).select('p', 'Hola')).toBeNull()
    expect(await setup(true, true).select('p', 'Mandame un sticker')).toBe('finnic')
  })
  it('restricts outbound assets to the catalog and packages real WebP files', async () => {
    expect(isFinnicSticker('../../secret')).toBe(false)
    const attachment = await setup().attachment('finnic')
    expect(attachment.dataUrl).toMatch(/^data:image\/webp;base64,/)
    expect((await setup().bytes('finnic')).length).toBeLessThan(100 * 1024)
  })
})
