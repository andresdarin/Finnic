import type { PersonalExpense } from '@prisma/client'

export type ExpenseSnapshot = {
  id: string; title: string; amount: string; currency: string; date: string; category: string
  financeAccountId: string | null; tranquilityCategoryId: string | null; tranquilityBucket: string | null
  source: string | null; sourceMessageId: string | null
}

/** Serializable view used for audit rows and channel replies (money stays a decimal string). */
export const expenseSnapshot = (row: PersonalExpense): ExpenseSnapshot => ({
  id: row.id, title: row.title, amount: row.amount.toFixed(2), currency: row.currency, date: row.date.toISOString(),
  category: row.category, financeAccountId: row.financeAccountId, tranquilityCategoryId: row.tranquilityCategoryId,
  tranquilityBucket: row.tranquilityBucket, source: row.source, sourceMessageId: row.sourceMessageId,
})
