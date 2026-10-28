import { compatibleAccount, resolveAccount, type IntakeAccount } from '../parsing/account-resolution'
import { formatMoney, optionList } from '../reply/format'
import type { Currency, ExpenseProposal, PendingField } from '../types'
import type { IntakeProfileContext } from './intake-context.service'

export type NextStep =
  | { kind: 'ask'; field: PendingField; question: string; proposal: ExpenseProposal; options?: Array<{ id: string; name: string; type: IntakeAccount['type']; label: string }> }
  | { kind: 'ready'; proposal: ExpenseProposal & { amount: string; currency: Currency; date: string }; account: IntakeAccount | null }

const accountLabel = (a: IntakeAccount) => {
  if (a.type === 'CASH') return /efectivo/i.test(a.name) ? a.name : `${a.name} · efectivo`
  if (a.type === 'CREDIT') return `${a.name} · crédito`
  return /cuenta bancaria|banco\s*\/\s*d[eé]bito/i.test(a.name) ? 'Débito' : `${a.name} · débito`
}

/**
 * Decides the single next question, in a fixed order, or declares the proposal ready.
 * Nothing is guessed: currency and account come from text, the ticket, or explicit defaults.
 */
export function nextStep(input: ExpenseProposal & { currencyConflict?: boolean; dateAsk?: boolean }, ctx: IntakeProfileContext): NextStep {
  const proposal: ExpenseProposal = { ...input }
  delete (proposal as { currencyConflict?: boolean }).currencyConflict
  delete (proposal as { dateAsk?: boolean }).dateAsk

  if (!proposal.amount) return { kind: 'ask', field: 'amount', proposal, question: '¿Cuál fue el importe total que pagaste?' }

  if (!proposal.currency && input.currencyConflict) {
    return { kind: 'ask', field: 'currency', proposal, question: `Veo pesos y dólares en el mensaje. ¿El importe de ${proposal.amount.replace('.', ',')} fue en pesos o en dólares?` }
  }
  if (!proposal.currency && proposal.accountHint) {
    const named = ctx.accounts.filter(a => a.purpose === 'OPERATING' && a.name === proposal.accountHint)
    if (named.length === 1) proposal.currency = named[0]!.currency
  }
  if (!proposal.currency && ctx.defaultCurrency) proposal.currency = ctx.defaultCurrency
  if (!proposal.currency) {
    return { kind: 'ask', field: 'currency', proposal, question: `¿El gasto de ${proposal.amount.replace('.', ',')} fue en pesos o en dólares?` }
  }

  if (!proposal.date || input.dateAsk) return { kind: 'ask', field: 'date', proposal, question: '¿Qué día fue la compra? (por ejemplo "hoy", "ayer" o 21/10)' }

  const selected = ctx.accounts.find(a => a.id === proposal.financeAccountId && compatibleAccount(a, proposal.currency!, proposal.paymentMethod))
  const resolution = selected && !proposal.accountless
    ? { status: 'RESOLVED' as const, account: selected, reason: 'name' as const }
    : resolveAccount({ accounts: ctx.accounts, currency: proposal.currency, method: proposal.paymentMethod, hint: proposal.accountHint, defaultAccountId: ctx.defaultAccountId, accountless: proposal.accountless })
  if (resolution.status === 'ASK') {
    const amount = formatMoney(proposal.amount, proposal.currency)
    const options = resolution.options.map(account => ({ id: account.id, name: account.name, type: account.type, label: accountLabel(account) }))
    const accountTypes = new Set(options.map(option => option.type))
    const expenseQuestion = accountTypes.has('CASH') && accountTypes.has('BANK')
      ? '¿Lo pagaste en efectivo o con débito?'
      : '¿Con qué cuenta lo pagaste?'
    const intro = options.length
      ? `${proposal.movementType === 'INCOME' ? `¿A qué cuenta sumo ${amount}?` : expenseQuestion}\n${optionList(options.map(option => option.label))}\nSi querés, lo dejo sin cuenta.`
      : proposal.paymentMethod === 'CREDIT'
        ? `Todavía no tenés una tarjeta de crédito cargada. ¿Lo dejo sin cuenta o preferís agregarla en Balance?`
        : `No tenés una cuenta de ${proposal.currency} para ese pago. ¿Lo dejo sin cuenta o querés agregarla en Balance?`
    return { kind: 'ask', field: 'account', proposal, question: intro, options }
  }
  return {
    kind: 'ready',
    proposal: { ...proposal, financeAccountId: resolution.account?.id ?? null, amount: proposal.amount, currency: proposal.currency, date: proposal.date },
    account: resolution.account,
  }
}
