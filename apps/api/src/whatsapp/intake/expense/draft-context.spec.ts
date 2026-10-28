import { describe, expect, it, vi } from 'vitest'
import { DraftResponder } from './draft-responder'
import { proposalFromText } from './text-proposal'
import { pickAccountAnswer } from '../parsing/account-resolution'
import type { IntakeProfileContext } from './intake-context.service'
import type { InboundContext } from '../types'

const profile: IntakeProfileContext = { profileId: 'p', timeZone: 'America/Montevideo', defaultAccountId: null, defaultCurrency: 'UYU', accounts: [], planCurrency: 'UYU', budgetCategories: [] }
const proposal = () => proposalFromText('Compré 3 libros a 427 pesos cada uno', null, profile, '2026-10-28')
const draft = () => ({ id: 'd', sourceInboundId: 'origin', sourceWamid: 'original-wa', pendingField: 'account' as const, proposal: proposal(), meta: {}, question: 'Cómo lo pagaste?' })
const context = (text: string) => ({ profileId: 'p', text, localDate: '2026-10-28' }) as InboundContext

describe('pending purchase continuity', () => {
  it.each(['Déjalo sin cuenta por ahora', 'Sin cuenta por ahora', 'Dale, dejalo sin cuenta', 'Prefiero sin cuenta de momento'])('understands the natural accountless answer: %s', answer => {
    expect(pickAccountAnswer(answer, [])).toBe('NONE')
  })
  it.each(['No lo dejes sin cuenta', 'Se puede dejar sin cuenta?', 'No quiero sin cuenta'])('does not infer accountless consent from: %s', answer => {
    expect(pickAccountAnswer(answer, [])).toBeNull()
  })
  it('leaves onboarding to resolve accountless payment and asks for final expense confirmation', async () => {
    const expenses = { continue: vi.fn(async () => ({ reply: 'Lo guardo?', intent: 'clarification' })) }
    const onboarding = { answer: vi.fn() }
    const responder = new DraftResponder({} as never, expenses as never, {} as never, onboarding as never)
    await responder.answer(context('Déjalo sin cuenta por ahora'), { ...draft(), meta: { accountCreation: { type: 'CREDIT', currency: 'UYU', stage: 'name' } } } as never, profile, false)
    expect(onboarding.answer).not.toHaveBeenCalled()
    expect(expenses.continue).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ accountless: true, confirmationRequired: true, receiptConfirmed: false }), profile, expect.objectContaining({ meta: {} }))
  })
  it('answers whether the books were saved from draft state without entering account onboarding', async () => {
    const expenses = { continue: vi.fn() }
    const onboarding = { answer: vi.fn() }
    const responder = new DraftResponder({} as never, expenses as never, {} as never, onboarding as never)
    expect((await responder.answer(context('Me registraste el gasto? De los libros?'), draft(), profile, false)).reply).toContain('sigue pendiente')
    expect(onboarding.answer).not.toHaveBeenCalled()
    expect(expenses.continue).not.toHaveBeenCalled()
  })
  it('calculates a purchase and requires review before saving the derived total', () => {
    expect(proposal()).toMatchObject({ amount: '1281.00', confirmationRequired: true })
  })
  it('updates the pending purchase with a discount without discarding the payment question or origin', async () => {
    const expenses = { continue: vi.fn(async () => ({ reply: 'Cómo lo pagaste?', intent: 'clarification' })) }
    const responder = new DraftResponder({} as never, expenses as never, {} as never)
    const pending = draft()
    await responder.answer(context('Salían 450 cada uno pero tenían 5% de descuento'), pending, profile, false)
    expect(expenses.continue).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ amount: '1282.50', receiptConfirmed: false }), profile, pending, expect.any(Array))
    expect(pending.proposal.amount).toBe('1281.00')
  })
  it('signals a conversational interruption without mutating or closing the draft', async () => {
    const repository = { close: vi.fn(), save: vi.fn() }
    const expenses = { continue: vi.fn() }
    const responder = new DraftResponder(repository as never, expenses as never, {} as never)
    expect(await responder.answer(context('Cómo calculaste eso?'), draft(), profile, false)).toMatchObject({ result: { unrecognizedDraftAnswer: true } })
    expect(repository.close).not.toHaveBeenCalled()
    expect(expenses.continue).not.toHaveBeenCalled()
  })
})
