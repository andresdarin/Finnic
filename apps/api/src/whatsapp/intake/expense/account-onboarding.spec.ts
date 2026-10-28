import { describe, expect, it, vi } from 'vitest'
import { AccountOnboardingService } from './account-onboarding.service'
import { accountMention, initialBalanceAnswer } from './account-onboarding'
import { proposalFromText } from './text-proposal'
import type { IntakeProfileContext } from './intake-context.service'
import type { StoredDraft } from './draft.repository'
import type { InboundContext } from '../types'

const profile: IntakeProfileContext = { profileId: 'p', timeZone: 'America/Montevideo', defaultCurrency: 'UYU', defaultAccountId: null, accounts: [], planCurrency: 'UYU', budgetCategories: [] }
const draft = (): StoredDraft => ({ id: 'd', sourceInboundId: 'origin', sourceWamid: 'wa-origin', pendingField: 'account', proposal: proposalFromText('Compré libros por 1281 pesos con crédito', null, profile, '2026-10-28'), meta: { accountCreation: { type: 'CREDIT', currency: 'UYU', stage: 'name' } }, question: 'Cómo se llama?' })
const ctx = (text: string) => ({ profileId: 'p', text, localDate: '2026-10-28' }) as InboundContext
const setup = () => {
  const accounts = { create: vi.fn(async () => ({ id: 'oca', name: 'OCA', currency: 'UYU' })) }
  const drafts = { save: vi.fn(async input => input) }
  const expenses = { continue: vi.fn(async (_ctx: unknown, _proposal: unknown) => ({ reply: 'Lo guardo?', intent: 'clarification' })) }
  return { accounts, drafts, expenses, service: new AccountOnboardingService(accounts as never, drafts as never, expenses as never) }
}

describe('conversational account onboarding', () => {
  it('extracts only the compatible account from the screenshot list', () => {
    expect(accountMention('mi cuenta itau (débito) oca blue (débito) prex (débito) oca (crédito) y efectivo', 'CREDIT')).toBe('oca')
    expect(accountMention('OCA (crédito) Visa (crédito)', 'CREDIT')).toBeNull()
  })
  it('asks the debt before requesting confirmation and never creates implicitly', async () => {
    const { service, accounts, drafts } = setup()
    expect((await service.answer(ctx('OCA'), draft(), profile))?.reply).toContain('Qué deuda')
    expect(accounts.create).not.toHaveBeenCalled()
    expect(drafts.save.mock.calls[0]![0]).toMatchObject({ sourceWamid: 'wa-origin', meta: { accountCreation: { name: 'OCA', stage: 'balance' } } })
  })
  it('accepts zero debt and proposes exact currency and balance before any write', async () => {
    const { service, accounts, drafts } = setup()
    const pending = draft(); pending.meta.accountCreation = { type: 'CREDIT', currency: 'UYU', name: 'OCA', stage: 'balance' }
    expect((await service.answer(ctx('sin deuda'), pending, profile))?.reply).toContain('deuda inicial de 0,00')
    expect(accounts.create).not.toHaveBeenCalled()
    expect(drafts.save.mock.calls[0]![0]).toMatchObject({ meta: { accountCreation: { initialBalance: '0.00', stage: 'confirm' } } })
  })
  it('creates only on confirmation then requires a separate purchase confirmation', async () => {
    const { service, accounts, expenses } = setup()
    const pending = draft(); pending.meta.accountCreation = { type: 'CREDIT', currency: 'UYU', name: 'OCA', initialBalance: '0.00', stage: 'confirm' }
    await service.answer(ctx('sí'), pending, profile)
    expect(accounts.create).toHaveBeenCalledWith('p', expect.objectContaining({ name: 'OCA', type: 'CREDIT', initialBalance: '0.00' }), 'd')
    expect(expenses.continue).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ financeAccountId: 'oca', confirmationRequired: true, receiptConfirmed: false }), expect.anything(), expect.objectContaining({ sourceWamid: 'wa-origin', meta: {} }), expect.any(Array))
  })
  it('cancels account creation while retaining the purchase and rejects invalid balances', async () => {
    const { service, accounts, drafts } = setup()
    await service.answer(ctx('no'), draft(), profile)
    expect(accounts.create).not.toHaveBeenCalled()
    expect(drafts.save.mock.calls[0]![0].meta.accountCreation).toBeUndefined()
    expect(initialBalanceAnswer('100 o 200')).toBeNull()
    expect(initialBalanceAnswer('-100')).toBeNull()
  })
  it('uses an existing compatible account instead of creating a duplicate', async () => {
    const { service, accounts, expenses } = setup()
    const pending = draft(); pending.meta.accountCreation = { type: 'CREDIT', currency: 'UYU', name: 'OCA', initialBalance: '0.00', stage: 'confirm' }
    await service.answer(ctx('sí'), pending, { ...profile, accounts: [{ id: 'existing', name: 'oca', type: 'CREDIT', currency: 'UYU', purpose: 'OPERATING', isActive: true }] })
    expect(accounts.create).not.toHaveBeenCalled()
    expect(expenses.continue.mock.calls[0]![1]).toMatchObject({ financeAccountId: 'existing' })
  })
})
