import { describe, expect, it, vi } from 'vitest'
import { DraftRepository, type StoredDraft } from './draft.repository'
import { DraftConfirmationService } from './draft-confirmation.service'
import { DraftRecoveryService } from './draft-recovery.service'

const pending = (): StoredDraft => ({ id: 'draft', sourceInboundId: 'source', sourceWamid: 'receipt-wa', pendingField: 'receipt_confirmation', question: 'Lo guardo?', meta: {}, proposal: { amount: '100.00', currency: 'UYU', title: 'Libros', merchant: null, date: '2026-10-28', category: 'otros_variables', budgetCategoryId: null, paymentMethod: null, accountHint: null, financeAccountId: null, accountless: true, inputMethod: 'MANUAL', receiptConfirmed: false } })

describe('conversation audit safeguards', () => {
  it.each(['no, por favor', 'sí pero cambiá el importe', 'podés guardarlo?', 'quizás'])('does not execute ambiguous, negative or conditional consent: %s', async text => {
    const expenses = { continue: vi.fn() }
    const service = new DraftConfirmationService({} as never, {} as never, {} as never, expenses as never)
    await expect(service.confirm({ text } as never, pending())).rejects.toThrow('confirmación inequívoca')
    expect(expenses.continue).not.toHaveBeenCalled()
  })
  it('rejects a stale confirmation after the proposal changes', async () => {
    const expected = pending()
    const current = { ...expected, proposal: { ...expected.proposal, amount: '200.00' } }
    const service = new DraftConfirmationService({ findOpen: vi.fn(async () => current) } as never, {} as never, {} as never, {} as never)
    await expect(service.confirm({ text: 'sí, por favor', profileId: 'p' } as never, expected)).rejects.toThrow('propuesta cambió')
  })
  it('checks the ledger before reporting that a completed draft still exists as a registered expense', async () => {
    const draft = pending()
    const prisma = { whatsAppExpenseDraft: { findMany: vi.fn(async () => [{ ...draft, status: 'completed', expenseId: 'deleted', updatedAt: new Date(), proposal: { proposal: draft.proposal, meta: {} } }]) }, personalExpense: { findMany: vi.fn(async () => []) } }
    const status = await new DraftRepository(prisma as never).recentStatus('owner')
    expect(status[0]).toMatchObject({ status: 'not_in_ledger', ledgerVerified: false, expenseId: null })
    expect(prisma.personalExpense.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ profileId: 'owner' }) }))
  })
  it('prepares a parked draft for fresh review while preserving its source and never confirming automatically', async () => {
    const draft = pending()
    const expenses = { continue: vi.fn(async () => ({ reply: 'Revisá el gasto. Lo guardo?', result: {} })) }
    const repository = { findOwned: vi.fn(async () => ({ draft, status: 'parked', registered: false })) }
    const service = new DraftRecoveryService(repository as never, { load: vi.fn(async () => ({})) } as never, expenses as never)
    await service.resume({ profileId: 'owner', text: 'retomá los libros' } as never, draft.id)
    expect(repository.findOwned).toHaveBeenCalledWith('owner', draft.id)
    expect(expenses.continue).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ receiptConfirmed: false, confirmationRequired: true }), expect.anything(), expect.objectContaining({ sourceWamid: 'receipt-wa' }), expect.any(Array))
  })
})
