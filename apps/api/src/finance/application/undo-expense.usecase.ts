import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { applyExpenseEffect } from './expense-account-effect'
import { expenseSnapshot } from './expense-snapshot'
import type { ExpenseAudit } from './correct-expense.usecase'

/** Removes an expense and reverts its account effect atomically. */
@Injectable()
export class UndoExpenseUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: { profileId: string; expenseId: string; audit?: ExpenseAudit }) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.personalExpense.findFirst({ where: { id: command.expenseId, profileId: command.profileId, movementType: 'EXPENSE' } })
      if (!row) throw new NotFoundException('Gasto no encontrado.')
      if (row.scheduledCashFlowId) throw new BadRequestException('Los pagos programados se revierten desde su obligación.')
      const before = expenseSnapshot(row)
      if (row.financeAccountId) {
        const account = await tx.financeAccount.findFirst({ where: { id: row.financeAccountId, profileId: command.profileId } })
        if (account) await applyExpenseEffect(tx, account, row.amount, -1)
      }
      await tx.personalExpense.delete({ where: { id: row.id } })
      await command.audit?.(tx, before, null)
      return { before }
    })
  }
}
