import { Injectable } from '@nestjs/common'
import { RegisterIncomeUseCase } from '../../../finance/application/register-income.usecase'
import { PrismaService } from '../../../prisma/prisma.service'
import { purchaseInstant } from '../parsing/local-date'
import type { ExpenseProposal } from '../types'

/** Reuse the app's atomic income/balance operation and its source-message idempotency. */
@Injectable()
export class DocumentIncomeService {
  constructor(private readonly income: RegisterIncomeUseCase, private readonly prisma: PrismaService) {}
  async create(profileId: string, sourceMessageId: string, proposal: ExpenseProposal & { amount: string; currency: 'UYU' | 'USD'; date: string }, source: 'web' | 'whatsapp') {
    const flow = await this.income.execute({ profileId, context: { source, inputMethod: 'RECEIPT_SCAN' }, input: { title: proposal.title, amount: proposal.amount, currency: proposal.currency, dueOn: purchaseInstant(proposal.date), accountId: proposal.financeAccountId ?? undefined, category: 'INGRESOS', frequency: 'ONCE', sourceMessageId } })
    return this.prisma.personalExpense.findFirstOrThrow({ where: { profileId, scheduledCashFlowId: flow.id, movementType: 'INCOME' } })
  }
}
