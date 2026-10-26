import { EXPENSE_CATEGORIES } from '../constants'
import type { TextExtraction } from '../ai/extraction.schemas'
import { aiAmountToCents, centsToMoney, moneyCandidates } from '../parsing/money-text'
import { currencySignal, hasDateSignal, paymentSignal } from '../parsing/signals'
import { addDays, validPurchaseDate } from '../parsing/local-date'
import type { ExpenseProposal } from '../types'
import { budgetCategoryFor, categoryFromText, isCategoryKey } from './categorize'
import type { IntakeProfileContext } from './intake-context.service'

/** Relative dates are resolved deterministically; the AI date is accepted only with textual evidence. */
export function dateFromText(text: string, today: string, aiDate: string | null): string | null | 'ASK' {
  if (!hasDateSignal(text)) return today
  const valid = validPurchaseDate(aiDate, today)
  if (valid) return valid
  if (/\b(antes de ayer|anteayer)\b/i.test(text)) return addDays(today, -2)
  if (/\b(ayer|anoche)\b/i.test(text)) return addDays(today, -1)
  if (/\bhoy\b/i.test(text)) return today
  return 'ASK'
}

/**
 * Builds a proposal from the user's words. Amount, currency and payment method are taken
 * only from what the user actually wrote; the AI supplies descriptive fields.
 */
export function proposalFromText(text: string, ai: TextExtraction | null, ctx: IntakeProfileContext, today: string): ExpenseProposal & { dateAsk: boolean; currencyConflict: boolean } {
  const candidates = moneyCandidates(text)
  const aiCents = aiAmountToCents(ai?.amount)
  const amountCents = aiCents !== null && candidates.includes(aiCents) ? aiCents : candidates.length === 1 ? candidates[0]! : null
  const signal = currencySignal(text)
  const category = isCategoryKey(ai?.category) ? ai!.category : categoryFromText(`${text} ${ai?.merchant ?? ''}`) ?? 'otros_variables'
  const merchant = ai?.merchant ?? null
  const date = dateFromText(text, today, ai?.date ?? null)
  const accountHint = ai?.accountName && ctx.accounts.some(a => a.name === ai.accountName) ? ai.accountName : null
  return {
    amount: amountCents === null ? null : centsToMoney(amountCents),
    currency: signal === 'USD' || signal === 'UYU' ? signal : null,
    currencyConflict: signal === 'CONFLICT',
    title: (ai?.title ?? merchant ?? EXPENSE_CATEGORIES[category]).slice(0, 120),
    merchant,
    date: date === 'ASK' ? null : date,
    dateAsk: date === 'ASK',
    category,
    budgetCategoryId: budgetCategoryFor(ctx.budgetCategories, ai?.budgetCategory ?? null, category),
    paymentMethod: paymentSignal(text),
    accountHint,
    financeAccountId: null,
    accountless: false,
    inputMethod: 'MANUAL',
  }
}
