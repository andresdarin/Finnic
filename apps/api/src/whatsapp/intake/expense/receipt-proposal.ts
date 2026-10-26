import type { ReceiptExtraction } from '../ai/extraction.schemas'
import { EXPENSE_CATEGORIES } from '../constants'
import { validPurchaseDate } from '../parsing/local-date'
import { aiAmountToCents, centsToMoney } from '../parsing/money-text'
import { currencySignal, paymentSignal } from '../parsing/signals'
import type { ExpenseProposal } from '../types'
import { budgetCategoryFor, categoryFromText } from './categorize'
import type { IntakeProfileContext } from './intake-context.service'
import { dateFromText } from './text-proposal'
import { RECEIPT_MIN_CONFIDENCE } from '../constants'

export type ReceiptReading = {
  proposal: ExpenseProposal & { currencyConflict?: boolean }
  amountOptions: string[]
  notes: string[]
  ambiguity: string | null
}

/**
 * Turns a ticket reading into a single expense: only the final total becomes the amount,
 * items are detail of that one movement, and any doubt about the total becomes a question.
 */
export function proposalFromReceipt(reading: ReceiptExtraction, caption: string, ctx: IntakeProfileContext, today: string, sha256: string): ReceiptReading {
  const notes: string[] = []
  const total = aiAmountToCents(reading.total)
  const tendered = aiAmountToCents(reading.amountTendered)
  const change = aiAmountToCents(reading.change)
  const alternatives = [...new Set(reading.totalCandidates.map(aiAmountToCents).filter((v): v is bigint => v !== null && v !== total))]
    .filter(v => v !== tendered && v !== change)
  let ambiguity: string | null = null
  if (total === null) ambiguity = 'No pude leer el total del ticket con seguridad.'
  else if (tendered !== null && change !== null && change > 0n && total === tendered) ambiguity = 'El total coincide con el importe entregado y hay vuelto; no sé cuál fue el total pagado.'
  else if (alternatives.length) ambiguity = 'Aparece más de un importe que podría ser el total.'
  else if (reading.confidence < RECEIPT_MIN_CONFIDENCE) ambiguity = 'La lectura del total es poco clara.'

  const amountOptions = [total, ...alternatives].filter((v): v is bigint => v !== null).map(centsToMoney)
  const captionCurrency = currencySignal(caption)
  const ticketCurrency = reading.currency ?? null
  const currencyConflict = captionCurrency === 'CONFLICT' || (captionCurrency !== null && ticketCurrency !== null && captionCurrency !== ticketCurrency)
  const currency = currencyConflict ? null : (captionCurrency as 'UYU' | 'USD' | null) ?? ticketCurrency

  let date = validPurchaseDate(reading.date, today)
  if (!date) {
    const fromCaption = dateFromText(caption, today, null)
    date = fromCaption === 'ASK' ? null : fromCaption
    if (date && !/\b(hoy|ayer|anteayer)\b/i.test(caption)) notes.push('El ticket no mostraba una fecha legible: usé la fecha del mensaje.')
  }

  const category = categoryFromText(`${reading.merchant ?? ''} ${caption}`) ?? (reading.items.length >= 3 ? 'supermercado' : 'otros_variables')
  return {
    proposal: {
      amount: ambiguity || total === null ? null : centsToMoney(total),
      currency, currencyConflict,
      title: (reading.merchant ?? `Ticket ${EXPENSE_CATEGORIES[category]}`).slice(0, 120),
      merchant: reading.merchant ?? null,
      date,
      category,
      budgetCategoryId: budgetCategoryFor(ctx.budgetCategories, null, category),
      paymentMethod: paymentSignal(caption) ?? reading.paymentMethod ?? null,
      accountHint: null, financeAccountId: null, accountless: false,
      inputMethod: 'RECEIPT_SCAN',
      items: reading.items.map(item => ({ name: item.name, totalPrice: item.totalPrice, quantity: item.quantity ?? null, unitPrice: item.unitPrice ?? null })),
      receipt: { sha256, subtotal: reading.subtotal, confidence: reading.confidence },
    },
    amountOptions: ambiguity ? amountOptions : [],
    notes,
    ambiguity,
  }
}
