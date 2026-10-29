import type { TextExtraction } from '../ai/extraction.schemas'
import { explicitDate } from '../parsing/explicit-date'
import { aiAmountToCents, centsToMoney, moneyCandidates, parseAmountToCents } from '../parsing/money-text'
import { currencySignal, hasDateSignal, paymentSignal } from '../parsing/signals'
import { dateFromText } from '../expense/text-proposal'
import type { Currency, PaymentMethod } from '../types'

export type CorrectionRequest = {
  amount?: string
  currency?: Currency
  paymentMethod?: PaymentMethod
  accountHint?: string
  date?: string
  fxRate?: string
}

const RATE = /cotizaci[oó]n\s*(?:de\s*)?([0-9]+(?:[.,][0-9]{1,8})?)/i

/** Only values the user wrote are used; nothing is inferred from the previous expense. */
export function correctionFromText(text: string, ai: TextExtraction | null, today: string, accountNames: string[]): CorrectionRequest {
  const request: CorrectionRequest = {}
  const rate = RATE.exec(text)
  if (rate) {
    const normalized = rate[1]!.replace(',', '.')
    if (Number(normalized) > 0) request.fxRate = normalized
    return request
  }
  const explicit = explicitDate(text, today)
  const candidates = moneyCandidates(explicit?.remaining ?? text)
  const aiCents = aiAmountToCents(ai?.amount)
  const cents = aiCents !== null && candidates.includes(aiCents) ? aiCents : candidates.length === 1 ? candidates[0]! : null
  if (cents !== null) request.amount = centsToMoney(cents)
  const currency = currencySignal(text)
  if (currency === 'UYU' || currency === 'USD') request.currency = currency
  const method = paymentSignal(text)
  if (method) request.paymentMethod = method
  if (ai?.accountName && accountNames.includes(ai.accountName)) request.accountHint = ai.accountName
  if (explicit || hasDateSignal(text)) {
    const date = dateFromText(text, today, ai?.date ?? null)
    if (date && date !== 'ASK') request.date = date
  }
  return request
}

export const isEmptyCorrection = (request: CorrectionRequest) => Object.keys(request).length === 0
export const validRate = (rate: string) => parseAmountToCents(rate.split('.')[0] ?? '0') !== null && Number(rate) > 0 && Number(rate) <= 1_000_000
