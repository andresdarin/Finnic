import { describe, expect, it, vi } from 'vitest'
import { ReceiptIntakeService } from './receipt-intake.service'
import { correctionFromText } from '../correction/correction-patch'
import { proposalFromReceipt } from './receipt-proposal'
import type { ReceiptExtraction } from '../ai/extraction.schemas'
import type { IntakeProfileContext } from './intake-context.service'
import type { InboundContext } from '../types'

const reading = { isReceipt: true, total: 160, totalCandidates: [], confidence: 0.99, currency: 'UYU', date: '2026-10-09', items: [], merchant: 'Sandra', subtotal: null, discounts: null } as unknown as ReceiptExtraction
const profile = { profileId: 'p', defaultCurrency: 'UYU', accounts: [], budgetCategories: [] } as unknown as IntakeProfileContext

describe('replacement receipt', () => {
  it.each([
    ['Corregime el gasto anterior con este ticket', { amount: '160.00' }],
    ['En lugar de ese gasto poné este, del 29 de octubre', { amount: '160.00', date: '2026-10-29' }],
  ])('updates the same expense without creating another: %s', async (text, request) => {
    const expenses = { continue: vi.fn() }
    const original = { id: 'original' }
    const corrections = { target: vi.fn(async () => ({ kind: 'found', expense: original })), applyCorrection: vi.fn(async () => ({ reply: 'Corregido', intent: 'correct_last' })) }
    const prisma = { whatsAppInboundMessage: { update: vi.fn() } }
    const service = new ReceiptIntakeService(prisma as never, {} as never, { extractReceipt: vi.fn(async () => reading) } as never, expenses as never, {} as never, corrections as never)
    await service.handle({ profileId: 'p', inboundId: 'in', text, localDate: '2026-10-29', type: 'image', attachment: { bytes: Buffer.from('photo'), mimeType: 'image/jpeg', sha256: 'hash' } } as InboundContext, profile)
    expect(corrections.applyCorrection).toHaveBeenCalledWith(expect.anything(), original, request, profile)
    expect(expenses.continue).not.toHaveBeenCalled()
  })
  it('does not mistake the requested day for an amount', () => {
    expect(correctionFromText('Cambiale la fecha al 29 de octubre', null, '2026-10-29', [])).toEqual({ date: '2026-10-29' })
  })
  it.each(['none', 'ambiguous'])('does not create or overwrite a movement when the original is %s', async kind => {
    const expenses = { continue: vi.fn() }
    const corrections = { target: vi.fn(async () => ({ kind, options: [{ id: 'one' }, { id: 'two' }] })), applyCorrection: vi.fn(), askWhich: vi.fn(async () => ({ reply: 'Cuál gasto?', intent: 'clarification' })) }
    const service = new ReceiptIntakeService({ whatsAppInboundMessage: { update: vi.fn() } } as never, {} as never, { extractReceipt: vi.fn(async () => reading) } as never, expenses as never, {} as never, corrections as never)
    await service.handle({ profileId: 'p', inboundId: 'in', text: 'Corregime el gasto anterior', localDate: '2026-10-29', type: 'image', attachment: { bytes: Buffer.from('photo'), mimeType: 'image/jpeg', sha256: 'hash' } } as InboundContext, profile)
    expect(expenses.continue).not.toHaveBeenCalled()
    expect(corrections.applyCorrection).not.toHaveBeenCalled()
    if (kind === 'ambiguous') expect(corrections.askWhich).toHaveBeenCalledOnce()
  })
  it('uses the explicitly requested date instead of the OCR date', () => {
    expect(proposalFromReceipt(reading, 'Este es del 29 de octubre', profile, '2026-10-29', 'hash').proposal.date).toBe('2026-10-29')
  })
})
