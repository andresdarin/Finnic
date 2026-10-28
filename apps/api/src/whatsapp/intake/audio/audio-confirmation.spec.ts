import { describe, expect, it, vi } from 'vitest'
import { ExpenseIntakeService } from '../expense/expense-intake.service'
import { applyDraftAnswer } from '../expense/draft-answer'
import type { ExpenseProposal, InboundContext } from '../types'
import type { IntakeProfileContext } from '../expense/intake-context.service'

const profile: IntakeProfileContext = { profileId: 'p', timeZone: 'America/Montevideo', defaultAccountId: null, defaultCurrency: 'UYU', accounts: [], planCurrency: null, budgetCategories: [] }
const ctx = { profileId: 'p', inboundId: 'in', wamid: 'voice', localDate: '2026-10-27', fromAudio: true } as InboundContext
const proposal: ExpenseProposal = { amount: '850.00', currency: 'UYU', title: 'Supermercado', merchant: null, date: '2026-10-27', category: 'supermercado', budgetCategoryId: null, paymentMethod: null, accountHint: null, financeAccountId: null, accountless: true, inputMethod: 'MANUAL' }
describe('voice expense confirmation', () => {
  it('never writes a complete voice expense before written confirmation', async () => {
    const create = { execute: vi.fn(async () => ({ id: 'expense' })) }
    const drafts = { save: vi.fn(async (input: object) => ({ id: 'draft', ...input })), close: vi.fn() }
    const service = new ExpenseIntakeService({ whatsAppExpenseAction: { upsert: vi.fn() } } as never, create as never, drafts as never)
    vi.spyOn(service, 'confirmation').mockResolvedValue('Guardado')
    const answer = await service.continue(ctx, proposal, profile)
    expect(answer.reply).toContain('850,00'); expect(answer.reply).toContain('por escrito')
    expect(create.execute).not.toHaveBeenCalled()
    const saved = drafts.save.mock.calls[0]![0] as { proposal: ExpenseProposal }
    expect(saved.proposal.audioConfirmationRequired).toBe(true)
    const confirmed = applyDraftAnswer('receipt_confirmation', 'sí', saved.proposal, {}, ctx.localDate)
    expect(confirmed.kind).toBe('updated')
    if (confirmed.kind !== 'updated') throw Error('Expected confirmation')
    await service.continue({ ...ctx, inboundId: 'written', fromAudio: false }, confirmed.proposal, profile)
    expect(create.execute).toHaveBeenCalledTimes(1)
  })
  it('keeps voice confirmation required after asking for a missing amount', async () => {
    const drafts = { save: vi.fn(async (input: object) => ({ id: 'draft', ...input })) }
    const create = { execute: vi.fn() }
    const service = new ExpenseIntakeService({} as never, create as never, drafts as never)
    await service.continue(ctx, { ...proposal, amount: null }, profile)
    expect(drafts.save).toHaveBeenCalledWith(expect.objectContaining({ field: 'amount', proposal: expect.objectContaining({ audioConfirmationRequired: true }) }))
    expect(create.execute).not.toHaveBeenCalled()
  })
})
