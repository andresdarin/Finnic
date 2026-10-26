import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { convertCurrency } from '@lovehold/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { applyExpenseEffect, expenseAccountFor } from './expense-account-effect'
import { expenseSnapshot, type ExpenseSnapshot } from './expense-snapshot'

const money = z.string().regex(/^(0|[1-9]\d*)\.\d{2}$/).refine(v => v !== '0.00', 'El importe debe ser positivo')
export const correctExpensePatchSchema = z.object({
  amount: money.optional(),
  currency: z.enum(['UYU', 'USD']).optional(),
  // null explicitly detaches the account (no balance effect).
  financeAccountId: z.string().min(1).nullable().optional(),
  date: z.string().datetime({ offset: true }).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  tranquilityCategoryId: z.string().min(1).nullable().optional(),
  // Explicit, user-provided rate (destination units per source unit). Never inferred.
  fxRate: z.object({ toCurrency: z.enum(['UYU', 'USD']), rate: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,8})?$/) }).nullable().optional(),
}).strict()
export type CorrectExpensePatch = z.infer<typeof correctExpensePatchSchema>
export type ExpenseAudit = (tx: Prisma.TransactionClient, before: ExpenseSnapshot, after: ExpenseSnapshot | null) => Promise<void>

@Injectable()
export class CorrectExpenseUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: { profileId: string; expenseId: string; patch: unknown; audit?: ExpenseAudit }) {
    const patch = correctExpensePatchSchema.parse(command.patch)
    const profile = await this.prisma.profile.findUnique({ where: { id: command.profileId }, select: { timeZone: true } })
    const timeZone = profile?.timeZone ?? 'America/Montevideo'
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.personalExpense.findFirst({ where: { id: command.expenseId, profileId: command.profileId, movementType: 'EXPENSE' } })
      if (!row) throw new NotFoundException('Gasto no encontrado.')
      if (row.scheduledCashFlowId) throw new BadRequestException('Los pagos programados se corrigen desde su obligación.')
      const before = expenseSnapshot(row)

      const amount = new Prisma.Decimal(patch.amount ?? row.amount.toFixed(2))
      const currency = patch.currency ?? row.currency
      const accountId = patch.financeAccountId === undefined ? row.financeAccountId : patch.financeAccountId
      if (row.financeAccountId) {
        const previous = await tx.financeAccount.findFirst({ where: { id: row.financeAccountId, profileId: command.profileId } })
        if (previous) await applyExpenseEffect(tx, previous, row.amount, -1)
      }
      const account = accountId ? await expenseAccountFor(tx, command.profileId, accountId, currency) : null
      if (account) await applyExpenseEffect(tx, account, amount, 1)

      const categoryId = patch.tranquilityCategoryId === undefined ? row.tranquilityCategoryId : patch.tranquilityCategoryId
      const category = categoryId ? await tx.tranquilityCategory.findFirst({ where: { id: categoryId, profileId: command.profileId } }) : null
      if (categoryId && !category) throw new BadRequestException('La categoría de presupuesto no existe.')

      const date = patch.date ? new Date(patch.date) : row.date
      const amountChanged = !amount.equals(row.amount)
      const fxSnapshot = this.fxSnapshot(patch, row.tranquilityFxSnapshot, amount, currency, date, amountChanged || currency !== row.currency)
      // Items describe the original ticket total; a corrected total invalidates them.
      if (amountChanged) await tx.personalExpenseItem.deleteMany({ where: { expenseId: row.id } })
      const updated = await tx.personalExpense.update({
        where: { id: row.id },
        data: {
          amount, currency, date, financeAccountId: account?.id ?? null,
          monthKey: new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).format(date),
          title: patch.title ?? row.title, category: patch.category ?? row.category,
          tranquilityCategoryId: category?.id ?? null, tranquilityBucket: category?.bucket ?? null,
          tranquilityFxSnapshot: fxSnapshot ?? Prisma.DbNull,
        },
      })
      const after = expenseSnapshot(updated)
      await command.audit?.(tx, before, after)
      return { before, after, account }
    })
  }

  private fxSnapshot(patch: CorrectExpensePatch, current: unknown, amount: Prisma.Decimal, currency: string, date: Date, invalidated: boolean) {
    if (patch.fxRate === null) return null
    if (patch.fxRate) {
      if (patch.fxRate.toCurrency === currency) throw new BadRequestException('La cotización debe convertir a otra moneda.')
      return { toCurrency: patch.fxRate.toCurrency, rate: patch.fxRate.rate, convertedAmount: convertCurrency(amount.toFixed(2), patch.fxRate.rate), asOf: date.toISOString().slice(0, 10) }
    }
    // A stored conversion belongs to the original amount; never reuse it silently.
    return invalidated ? null : (current as Prisma.InputJsonValue | null) ?? null
  }
}
