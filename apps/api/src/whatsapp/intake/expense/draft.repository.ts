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
    // Starting a new expense closes any other open draft so replies cannot hit the wrong one.
    await this.prisma.whatsAppExpenseDraft.updateMany({ where: { profileId: input.profileId, status: 'awaiting', sourceInboundId: { not: input.sourceInboundId } }, data: { status: 'cancelled' } })
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
}
