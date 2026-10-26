import type { PrismaService } from '../../../prisma/prisma.service'
import { normalizeText } from '../parsing/signals'
import type { ExpenseProposal } from '../types'

export type ReceiptDuplicate = { id: string; amount: string; currency: string; date: string; reason: 'same_image' | 'same_purchase' }

/**
 * A ticket is a likely duplicate when the same image was already registered, or when another
 * ticket has the same merchant, total, currency and date. Typed expenses are never flagged,
 * so identical legitimate purchases (two coffees) are not blocked.
 */
export async function findReceiptDuplicate(prisma: PrismaService, profileId: string, proposal: ExpenseProposal & { amount: string; date: string }, ownWamid: string): Promise<ReceiptDuplicate | null> {
  const sha = proposal.receipt?.sha256
  if (sha) {
    const previous = await prisma.whatsAppInboundMessage.findMany({ where: { profileId, mediaSha256: sha, status: 'completed', wamid: { not: ownWamid } }, select: { wamid: true }, take: 10 })
    const wamids = previous.map(row => row.wamid)
    if (wamids.length) {
      const row = await prisma.personalExpense.findFirst({ where: { profileId, sourceMessageId: { in: wamids } } })
      if (row) return { id: row.id, amount: row.amount.toFixed(2), currency: row.currency, date: row.date.toISOString(), reason: 'same_image' }
    }
  }
  const sameDay = await prisma.personalExpense.findMany({
    where: {
      profileId, movementType: 'EXPENSE', inputMethod: 'RECEIPT_SCAN', amount: proposal.amount, currency: proposal.currency ?? undefined,
      date: { gte: new Date(`${proposal.date}T00:00:00-03:00`), lt: new Date(`${proposal.date}T23:59:59.999-03:00`) },
      NOT: { sourceMessageId: ownWamid },
    },
    take: 5,
  })
  const merchant = proposal.merchant ? normalizeText(proposal.merchant) : null
  const match = sameDay.find(row => !merchant || !row.merchant || normalizeText(row.merchant) === merchant)
  return match ? { id: match.id, amount: match.amount.toFixed(2), currency: match.currency, date: match.date.toISOString(), reason: 'same_purchase' } : null
}
