import { describe, expect, it } from 'vitest'
import { resolveAccount, type IntakeAccount } from '../parsing/account-resolution'
import { nextStep } from '../expense/next-step'
import { proposalFromText } from '../expense/text-proposal'
import type { IntakeProfileContext } from '../expense/intake-context.service'

const accounts: IntakeAccount[] = [
  { id: 'cash', name: 'Efectivo', type: 'CASH', currency: 'UYU', purpose: 'OPERATING', isActive: true },
  { id: 'bank', name: 'Cuenta Bancaria / Débito', type: 'BANK', currency: 'UYU', purpose: 'OPERATING', isActive: true },
]
const ctx: IntakeProfileContext = { profileId: 'p', timeZone: 'America/Montevideo', defaultAccountId: 'bank', defaultCurrency: 'UYU', accounts, planCurrency: 'UYU', budgetCategories: [] }
const proposal = () => proposalFromText('Gasté 1271,61 pesos con crédito', null, ctx, '2026-10-26')

describe('credit account compatibility', () => {
  it('asks for the payment method conversationally without enumerating accounts', () => {
    const result = nextStep({ ...proposal(), paymentMethod: null }, { ...ctx, defaultAccountId: null })
    expect(result).toMatchObject({ kind: 'ask', field: 'account', question: '¿Lo pagaste en efectivo, débito o crédito?' })
  })
  it('never offers cash or debit when the purchase used credit, even when named explicitly', () => {
    expect(resolveAccount({ accounts, currency: 'UYU', method: 'CREDIT', hint: 'Efectivo', defaultAccountId: 'bank' })).toEqual({ status: 'ASK', options: [], reason: 'no_match' })
    expect(nextStep(proposal(), ctx)).toMatchObject({ kind: 'ask', field: 'account', options: [], question: expect.stringContaining('no tenés una tarjeta de crédito cargada') })
  })
  it('rejects an incompatible selection from the old account menu', () => {
    expect(nextStep({ ...proposal(), financeAccountId: 'bank' }, ctx)).toMatchObject({ kind: 'ask', field: 'account', options: [] })
  })
  it('preserves credit when the user explicitly chooses no account', () => {
    expect(nextStep({ ...proposal(), accountless: true, financeAccountId: 'bank' }, ctx)).toMatchObject({ kind: 'ready', account: null, proposal: { paymentMethod: 'CREDIT', financeAccountId: null } })
  })
  it('selects the compatible credit card when one exists', () => {
    const credit: IntakeAccount = { ...accounts[1]!, id: 'visa', name: 'Visa', type: 'CREDIT' }
    expect(nextStep(proposal(), { ...ctx, accounts: [...accounts, credit] })).toMatchObject({ kind: 'ready', account: { id: 'visa' } })
  })
})
