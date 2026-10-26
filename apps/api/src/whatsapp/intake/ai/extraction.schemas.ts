import { z } from 'zod'

const nullableString = z.string().trim().max(200).nullable().optional().transform(value => value || null)
const money = z.union([z.string(), z.number()]).nullable().optional().transform(value => value === undefined || value === null ? null : String(value))
const method = z.enum(['DEBIT', 'CREDIT', 'CASH', 'TRANSFER', 'CARD']).nullable().optional().catch(null)

export const textExtractionSchema = z.object({
  intent: z.enum(['register_expense', 'correct_last', 'undo_last', 'query_month_spending', 'query_spending_capacity', 'query_savings', 'query_can_afford', 'help', 'other']).catch('other'),
  amount: money,
  currency: z.enum(['UYU', 'USD']).nullable().optional().catch(null),
  merchant: nullableString,
  title: nullableString,
  category: nullableString,
  budgetCategory: nullableString,
  paymentMethod: method,
  accountName: nullableString,
  date: nullableString,
  window: z.enum(['today', 'weekend', 'restOfMonth']).nullable().optional().catch(null),
  fxRate: money,
})
export type TextExtraction = z.infer<typeof textExtractionSchema>

export const receiptExtractionSchema = z.object({
  isReceipt: z.boolean().catch(false),
  merchant: nullableString,
  date: nullableString,
  currency: z.enum(['UYU', 'USD']).nullable().optional().catch(null),
  total: money,
  subtotal: money,
  discounts: money,
  amountTendered: money,
  change: money,
  totalCandidates: z.array(z.union([z.string(), z.number()]).transform(String)).max(10).catch([]).default([]),
  paymentMethod: method,
  items: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    quantity: z.number().nonnegative().nullable().optional(),
    unitPrice: z.number().nonnegative().nullable().optional(),
    totalPrice: z.number().nonnegative(),
  })).max(200).catch([]).default([]),
  confidence: z.number().min(0).max(1).catch(0),
  warnings: z.array(z.string().max(300)).max(20).catch([]).default([]),
})
export type ReceiptExtraction = z.infer<typeof receiptExtractionSchema>
