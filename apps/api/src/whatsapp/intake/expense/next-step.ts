import { compatibleAccount, resolveAccount, type IntakeAccount } from '../parsing/account-resolution'
import { formatMoney, optionList, PAYMENT_LABELS } from '../reply/format'
import type { Currency, ExpenseProposal, PendingField } from '../types'
import type { IntakeProfileContext } from './intake-context.service'

export type NextStep =
  | { kind: 'ask'; field: PendingField; question: string; proposal: ExpenseProposal; options?: Array<{ id: string; name: string }> }
  | { kind: 'ready'; proposal: ExpenseProposal & { amount: string; currency: Currency; date: string }; account: IntakeAccount | null }

const accountLabel = (a: IntakeAccount) => `${a.name} (${a.type === 'CREDIT' ? 'crédito' : a.type === 'CASH' ? 'efectivo' : 'banco/débito'} · ${a.currency})`

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
    const method = proposal.paymentMethod ? ` con ${PAYMENT_LABELS[proposal.paymentMethod]}` : ''
    const intro = resolution.options.length
      ? `¿Con qué cuenta pagaste ${amount}${method}? Respondé con el número:\n${optionList(resolution.options.map(accountLabel))}\nO "sin cuenta" para registrarlo sin mover saldos.`
      : proposal.paymentMethod === 'CREDIT'
        ? `El ticket indica un pago con crédito por ${amount}, pero no tenés una tarjeta de crédito configurada en ${proposal.currency}. Podés crearla en Balance y escribirme el nombre, o responder "sin cuenta" para guardar el gasto como crédito sin actualizar la deuda de una tarjeta.`
        : `No tenés una cuenta compatible en ${proposal.currency}${method} para ${amount}. Respondé "sin cuenta" para registrarlo sin mover saldos, o creá la cuenta en Balance y escribime el nombre.`
    return { kind: 'ask', field: 'account', proposal, question: intro, options: resolution.options.map(a => ({ id: a.id, name: a.name })) }
  }
  return {
    kind: 'ready',
    proposal: { ...proposal, financeAccountId: resolution.account?.id ?? null, amount: proposal.amount, currency: proposal.currency, date: proposal.date },
    account: resolution.account,
  }
}
