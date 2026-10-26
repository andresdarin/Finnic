import { z } from 'zod'

const decimal = z.union([z.string(), z.number()]).transform((value) => Number(value).toFixed(2))
const positiveDecimal = decimal.refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, {
  message: 'Debe ser un número positivo',
})
// Rates are not money amounts: retain enough precision for UYU -> USD quotes.
const exchangeRateDecimal = z.union([z.string(), z.number()]).transform((value) => Number(value).toFixed(8))
const isoDateTime = z.string().transform((val, ctx) => {
  const d = new Date(val)
  if (isNaN(d.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid datetime string' })
    return z.NEVER
  }
  return d.toISOString()
})

const item = z.object({
  name: z.string().min(1),
  category: z.string().min(1).optional(),
  itemCategory: z.string().optional(),
  quantity: z.number().nonnegative().optional(),
  unitPrice: z.number().nonnegative().optional(),
  totalPrice: z.number().nonnegative().optional(),
  total: z.number().nonnegative().optional(),
  rawLine: z.string().optional(),
  rawText: z.string().optional(),
  unit: z.string().optional(),
})

export const createExpenseSchema = z.object({
  title: z.string().min(1).max(120),
  merchant: z.string().max(120).optional(),
  amount: decimal,
  currency: z.enum(['UYU', 'USD']).default('UYU'),
  date: isoDateTime,
  category: z.string().min(1).max(80),
  type: z.enum(['fixed', 'variable', 'supermarket']).optional(),
  movementType: z.enum(['EXPENSE', 'INCOME', 'TRANSFER']).default('EXPENSE'),
  inputMethod: z.enum(['MANUAL', 'RECEIPT_SCAN', 'IMPORT']).default('MANUAL'),
  notes: z.string().max(500).optional(),
  isRecurring: z.boolean().optional(),
  recurrenceDay: z.number().int().min(1).max(31).optional(),
  items: z.array(item).optional(),
  financeAccountId: z.string().optional(),
  scheduledCashFlowId: z.string().optional(),
  scheduledDueOn: z.string().optional(),
  tranquilityCategoryId: z.string().min(1).optional(),
})

export const registerIncomeSchema = z.object({
  title: z.string().min(1).max(120),
  amount: decimal,
  currency: z.enum(['UYU', 'USD']).default('UYU'),
  dueOn: isoDateTime,
  accountId: z.string().optional(),
  category: z.string().max(80).optional(),
  frequency: z.enum(['ONCE', 'MONTHLY']).default('ONCE'),
  sourceMessageId: z.string().min(1).optional(),
})

export const createTransferSchema = z.object({
  sourceAccountId: z.string().min(1),
  destinationAccountId: z.string().min(1),
  amount: positiveDecimal,
  currency: z.enum(['UYU', 'USD']).optional(),
  destinationAmount: positiveDecimal.optional(),
  destinationCurrency: z.enum(['UYU', 'USD']).optional(),
  exchangeRate: exchangeRateDecimal.refine((value) => Number(value) > 0, { message: 'La tasa debe ser positiva' }).optional(),
  baseCurrency: z.enum(['UYU', 'USD']).optional(),
  quoteCurrency: z.enum(['UYU', 'USD']).optional(),
  feeAmount: positiveDecimal.optional(),
  feeAccountId: z.string().optional(),
  date: isoDateTime,
  description: z.string().max(200).optional(),
})

export const createFinanceAccountSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(['CASH', 'BANK', 'CREDIT']).default('BANK'),
  currency: z.enum(['UYU', 'USD']).default('UYU'),
  initialBalance: decimal.optional().default('0.00'),
  creditLimit: decimal.optional(),
  closingDay: z.number().int().min(1).max(31).optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  isSpendable: z.boolean().optional().default(true),
})

export const adjustAccountBalanceSchema = z.object({
  newBalance: decimal,
  reason: z.string().max(200).optional(),
})

export const simulatePurchaseSchema = z.object({ amount: decimal, currency: z.enum(['UYU', 'USD']).default('UYU') })
export const resolveScheduledCashFlowSchema = z.object({ expectedDueOn: z.string().date(), resolution: z.enum(['PAID', 'RECEIVED', 'SKIPPED']) })

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type RegisterIncomeInput = z.infer<typeof registerIncomeSchema>
export type CreateTransferInput = z.infer<typeof createTransferSchema>
export type CreateFinanceAccountInput = z.infer<typeof createFinanceAccountSchema>
export type AdjustAccountBalanceInput = z.infer<typeof adjustAccountBalanceSchema>
export type SimulatePurchaseInput = z.infer<typeof simulatePurchaseSchema>
