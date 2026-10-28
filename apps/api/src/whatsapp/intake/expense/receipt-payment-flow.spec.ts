import { describe, expect, it, vi } from 'vitest'
import { receiptExtractionSchema } from '../ai/extraction.schemas'
import { ReceiptIntakeService } from './receipt-intake.service'
import { ExpenseIntakeService } from './expense-intake.service'
import { AccountOnboardingService } from './account-onboarding.service'
import { DraftResponder } from './draft-responder'
import type { StoredDraft } from './draft.repository'
import type { IntakeProfileContext } from './intake-context.service'
import type { InboundContext } from '../types'

// One vertical conversation through real receipt, proposal, intake and draft handlers.
// Only external OCR, persistence and writes are substituted; no live API calls or messages.
function conversation(provider: string) {
  let pending: StoredDraft
  const profile: IntakeProfileContext = { profileId: 'p', timeZone: 'America/Montevideo', defaultCurrency: 'UYU', defaultAccountId: 'bank', planCurrency: 'UYU', budgetCategories: [], accounts: [{ id: 'bank', name: 'Cuenta habitual', currency: 'UYU', type: 'BANK', purpose: 'OPERATING', isActive: true }] }
  const drafts = { save: vi.fn(async input => { pending = { id: 'draft', sourceInboundId: input.sourceInboundId, sourceWamid: input.sourceWamid, pendingField: input.field, question: input.question, proposal: input.proposal, meta: input.meta ?? {} }; return pending }), close: vi.fn() }
  const prisma = { whatsAppInboundMessage: { update: vi.fn(), findMany: vi.fn(async () => []) }, personalExpense: { findMany: vi.fn(async () => []) } }
  const write = { execute: vi.fn() }
  const accounts = { create: vi.fn(async () => ({ id: 'new-card', name: provider, currency: 'UYU' })) }
  const expenses = new ExpenseIntakeService(prisma as never, write as never, drafts as never)
  const onboarding = new AccountOnboardingService(accounts as never, drafts as never, expenses)
  const responder = new DraftResponder(drafts as never, expenses, {} as never, onboarding)
  const reading = receiptExtractionSchema.parse({ isReceipt: true, merchant: 'Comercio', total: '100.00', totalCandidates: [], currency: 'UYU', date: '2026-10-28', paymentMethod: 'CARD', paymentProvider: provider, confidence: 1, items: [{ name: 'Producto', quantity: 2, unitPrice: 50, totalPrice: 100 }] })
  const receipts = new ReceiptIntakeService(prisma as never, {} as never, { extractReceipt: vi.fn(async () => reading) } as never, expenses, drafts as never)
  const ctx = (text: string): InboundContext => ({ profileId: 'p', inboundId: 'receipt', wamid: 'receipt-wa', text, type: 'image', localDate: '2026-10-28', contextWamid: null, media: null, attachment: { bytes: Buffer.from('fixture'), mimeType: 'image/jpeg', sha256: 'fixture-sha' } })
  return { start: () => receipts.handle(ctx(''), profile), say: (text: string) => responder.answer({ ...ctx(text), type: 'text', inboundId: `reply-${text}` }, pending, profile, false), pending: () => pending, write, accounts }
}

describe('receipt with an unknown named payment instrument', () => {
  it.each(['OCA', 'Billetera Nueva'])('keeps %s and the receipt through consent, type, unknown debt, and separate expense review', async provider => {
    const flow = conversation(provider)
    const first = await flow.start()
    expect(first.reply).toContain('Leí el ticket de Comercio')
    expect(first.reply).toContain(`indica ${provider}`)
    expect(first.reply).toContain('Querés agregarlo o dejar este gasto sin cuenta?')
    expect(flow.accounts.create).not.toHaveBeenCalled()
    expect((await flow.say('sí')).reply).toContain('débito, crédito o efectivo?')
    expect((await flow.say('crédito')).reply).toContain('Qué deuda')
    expect((await flow.say('no sé, vamos a empezar ahora')).reply).toContain('sin incluir la deuda anterior')
    expect(flow.accounts.create).not.toHaveBeenCalled()
    expect((await flow.say('dale')).reply).toContain('Producto')
    expect(flow.accounts.create).toHaveBeenCalledTimes(1)
    expect(flow.pending().pendingField).toBe('receipt_confirmation')
    expect(flow.pending().proposal).toMatchObject({ amount: '100.00', financeAccountId: 'new-card', items: [{ name: 'Producto', totalPrice: 100 }] })
    expect(flow.write.execute).not.toHaveBeenCalled()
  })
  it('lets the user decline the new method without losing the ticket or creating an account', async () => {
    const flow = conversation('Otro Medio')
    await flow.start()
    const result = await flow.say('no')
    expect(result.reply).toContain('Producto')
    expect(flow.pending().proposal.accountless).toBe(true)
    expect(flow.accounts.create).not.toHaveBeenCalled()
    expect(flow.write.execute).not.toHaveBeenCalled()
  })
})
