import { Injectable } from '@nestjs/common'
import type { WhatsAppExpenseDraft } from '@prisma/client'
import { PrismaService } from '../../../prisma/prisma.service'
import { DRAFT_TTL_MS } from '../constants'
import type { ExpenseProposal, PendingField } from '../types'
import type { DraftMeta } from './draft-answer'

export type StoredDraft = { id: string; sourceInboundId: string; sourceWamid: string; pendingField: PendingField; proposal: ExpenseProposal; meta: DraftMeta; question: string | null }

const decode = (row: WhatsAppExpenseDraft): StoredDraft => {
  const stored = (row.proposal ?? {}) as { proposal?: ExpenseProposal; meta?: DraftMeta }
  return { id: row.id, sourceInboundId: row.sourceInboundId, sourceWamid: row.sourceWamid, pendingField: row.pendingField as PendingField, proposal: stored.proposal as ExpenseProposal, meta: stored.meta ?? {}, question: row.question }
}

@Injectable()
export class DraftRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOpen(profileId: string): Promise<StoredDraft | null> {
    await this.prisma.whatsAppExpenseDraft.updateMany({ where: { profileId, status: 'awaiting', expiresAt: { lt: new Date() } }, data: { status: 'expired' } })
    const row = await this.prisma.whatsAppExpenseDraft.findFirst({ where: { profileId, status: 'awaiting' }, orderBy: { updatedAt: 'desc' } })
    return row ? decode(row) : null
  }

  /** One draft per origin message; re-asking updates it in place. */
  async save(input: { profileId: string; sourceInboundId: string; sourceWamid: string; field: PendingField; question: string; proposal: ExpenseProposal; meta?: DraftMeta }) {
    const data = { pendingField: input.field, question: input.question, proposal: { proposal: input.proposal, meta: input.meta ?? {} } as object, status: 'awaiting', expiresAt: new Date(Date.now() + DRAFT_TTL_MS) }
    // Preserve unfinished work separately; never describe a replaced draft as a user cancellation.
    await this.prisma.whatsAppExpenseDraft.updateMany({ where: { profileId: input.profileId, status: 'awaiting', sourceInboundId: { not: input.sourceInboundId } }, data: { status: 'parked' } })
    const row = await this.prisma.whatsAppExpenseDraft.upsert({
      where: { sourceInboundId: input.sourceInboundId },
      create: { profileId: input.profileId, sourceInboundId: input.sourceInboundId, sourceWamid: input.sourceWamid, ...data },
      update: data,
    })
    return decode(row)
  }

  async close(id: string, profileId: string, status: 'completed' | 'cancelled', expenseId?: string) {
    await this.prisma.whatsAppExpenseDraft.updateMany({ where: { id, profileId }, data: { status, expenseId: expenseId ?? null } })
  }

  async cancelOpen(profileId: string) {
    return (await this.prisma.whatsAppExpenseDraft.updateMany({ where: { profileId, status: 'awaiting' }, data: { status: 'cancelled' } })).count
  }

  async findOwned(profileId: string, id: string) {
    const row = await this.prisma.whatsAppExpenseDraft.findFirst({ where: { id, profileId } })
    if (!row) return null
    const registered = await this.prisma.personalExpense.findFirst({ where: { profileId, OR: [{ sourceMessageId: row.sourceWamid }, ...(row.expenseId ? [{ id: row.expenseId }] : [])] }, select: { id: true } })
    return { draft: decode(row), status: row.status, registered: Boolean(registered) }
  }

  async recentStatus(profileId: string) {
    const rows = await this.prisma.whatsAppExpenseDraft.findMany({ where: { profileId }, orderBy: { updatedAt: 'desc' }, take: 20 })
    if (!rows.length) return []
    const expenses = await this.prisma.personalExpense.findMany({ where: { profileId, OR: [{ sourceMessageId: { in: rows.map(row => row.sourceWamid) } }, { id: { in: rows.flatMap(row => row.expenseId ? [row.expenseId] : []) } }] }, select: { id: true, sourceMessageId: true, title: true, amount: true, currency: true } })
    return rows.map(row => {
      const draft = decode(row)
      const expense = expenses.find(expense => expense.id === row.expenseId || expense.sourceMessageId === row.sourceWamid)
      return { draftId: row.id, title: expense?.title ?? draft.proposal.title, amount: expense?.amount.toFixed(2) ?? draft.proposal.amount, currency: expense?.currency ?? draft.proposal.currency, status: expense ? 'completed' : row.status === 'completed' ? 'not_in_ledger' : row.status, expenseId: expense?.id ?? null, ledgerVerified: Boolean(expense), pendingField: draft.pendingField, updatedAt: row.updatedAt, ...(row.status === 'cancelled' ? { note: 'Puede ser una cancelación o un reemplazo del flujo anterior. No atribuir una intención al usuario.' } : {}) }
    })
  }
}
