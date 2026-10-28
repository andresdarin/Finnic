import { pickAccountAnswer } from '../parsing/account-resolution'
import { addDays, validPurchaseDate } from '../parsing/local-date'
import { centsToMoney, moneyCandidates } from '../parsing/money-text'
import { currencySignal, normalizeText, paymentSignal } from '../parsing/signals'
import type { ExpenseProposal, PendingField } from '../types'
import { movementDirection } from './movement-direction'

export type DraftMeta = { accountConfirmationInboundId?: string; accountCreation?: import('./account-onboarding').AccountOnboarding; options?: Array<{ id: string; name: string; type?: 'CASH' | 'BANK' | 'CREDIT'; label?: string }>; amountOptions?: string[] }
export type DraftAnswer = { kind: 'updated'; proposal: ExpenseProposal } | { kind: 'cancel' } | { kind: 'not_understood' }

const YES = /^(si|sii|dale|ok|okay|registralo|registrar|confirmo|confirmar|de una|correcto)$/
const NO = /^(no|nop|cancelar|cancela|no lo registres|dejalo)$/

export function parseDateAnswer(answer: string, today: string): string | null {
  const text = normalizeText(answer)
  if (text === 'hoy') return today
  if (text === 'ayer') return addDays(today, -1)
  if (text === 'anteayer' || text === 'antes de ayer') return addDays(today, -2)
  const match = /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2}|\d{4}))?$/.exec(answer.trim())
  if (!match) return null
  const year = match[3] ? (match[3].length === 2 ? `20${match[3]}` : match[3]) : today.slice(0, 4)
  const candidate = `${year}-${match[2]!.padStart(2, '0')}-${match[1]!.padStart(2, '0')}`
  // "28/12" sent in January refers to last year.
  return validPurchaseDate(candidate, today) ?? (match[3] ? null : validPurchaseDate(`${Number(year) - 1}${candidate.slice(4)}`, today))
}

/** Applies a reply to the single pending field. Unrecognized replies never change the draft. */
export function applyDraftAnswer(field: PendingField, answer: string, proposal: ExpenseProposal, meta: DraftMeta, today: string): DraftAnswer {
  const text = normalizeText(answer)
  if (/^(cancelar|cancela|olvidalo)$/.test(text)) return { kind: 'cancel' }
  if (field === 'movement_direction') {
    const direction = movementDirection(answer)
    return direction === 'INCOME' || direction === 'EXPENSE' ? { kind: 'updated', proposal: { ...proposal, movementType: direction, receiptConfirmed: false } } : { kind: 'not_understood' }
  }
  if (field === 'receipt_confirmation') {
    if (YES.test(text)) return { kind: 'updated', proposal: { ...proposal, receiptConfirmed: true } }
    if (NO.test(text)) return { kind: 'cancel' }
    return { kind: 'not_understood' }
  }
  if (field === 'duplicate') {
    if (YES.test(text)) return { kind: 'updated', proposal: { ...proposal, duplicateAcknowledged: true } }
    if (NO.test(text)) return { kind: 'cancel' }
    return { kind: 'not_understood' }
  }
  if (field === 'amount') {
    const index = /^\d$/.test(text) ? Number(text) : null
    if (index && meta.amountOptions?.[index - 1]) return { kind: 'updated', proposal: { ...proposal, amount: meta.amountOptions[index - 1]! } }
    const values = moneyCandidates(answer)
    if (values.length !== 1) return { kind: 'not_understood' }
    const currency = currencySignal(answer)
    return { kind: 'updated', proposal: { ...proposal, amount: centsToMoney(values[0]!), currency: currency === 'UYU' || currency === 'USD' ? currency : proposal.currency } }
  }
  if (field === 'currency') {
    const currency = currencySignal(answer)
    if (currency !== 'UYU' && currency !== 'USD') return { kind: 'not_understood' }
    return { kind: 'updated', proposal: { ...proposal, currency } }
  }
  if (field === 'date') {
    const date = parseDateAnswer(answer, today)
    return date ? { kind: 'updated', proposal: { ...proposal, date } } : { kind: 'not_understood' }
  }
  if (field === 'account') {
    const picked = pickAccountAnswer(answer, meta.options ?? [])
    if (picked === 'NONE') return { kind: 'updated', proposal: { ...proposal, accountless: true, financeAccountId: null } }
    if (picked) return { kind: 'updated', proposal: { ...proposal, financeAccountId: picked, accountless: false } }
    const method = paymentSignal(answer)
    if (method && method !== proposal.paymentMethod) return { kind: 'updated', proposal: { ...proposal, paymentMethod: method } }
    return { kind: 'not_understood' }
  }
  return { kind: 'not_understood' }
}
