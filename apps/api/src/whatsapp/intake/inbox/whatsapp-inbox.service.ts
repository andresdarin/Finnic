import { Injectable } from '@nestjs/common'
import type { WhatsAppInboundMessage } from '@prisma/client'
import { PrismaService } from '../../../prisma/prisma.service'
import type { NormalizedWhatsAppMessage } from '../../../webhooks/whatsapp/whatsapp-webhook.service'
import { MAX_PROCESSING_ATTEMPTS, MAX_REPLY_ATTEMPTS, PROCESSING_LEASE_MS, RETRY_BACKOFF_MS } from '../constants'

const backoff = (attempt: number) => RETRY_BACKOFF_MS[Math.min(attempt - 1, RETRY_BACKOFF_MS.length - 1)]!
const safeError = (error: unknown) => (error instanceof Error ? error.message : 'Error de procesamiento').slice(0, 300)

/** Durable inbox: persistence, leases, retries and the independent reply lifecycle. */
@Injectable()
export class WhatsAppInboxService {
  constructor(private readonly prisma: PrismaService) {}

  /** Persists before Meta gets its 200. Duplicate deliveries collapse on the wamid unique key. */
  async enqueue(messages: NormalizedWhatsAppMessage[]) {
    if (!messages.length) return 0
    const result = await this.prisma.whatsAppInboundMessage.createMany({
      skipDuplicates: true,
      data: messages.map(message => ({
        wamid: message.wamid, from: message.from, phoneNumberId: message.phoneNumberId, type: message.type, body: message.text || null,
        status: 'received', contextWamid: message.contextWamid ?? null,
        messageTimestamp: message.timestamp && /^\d+$/.test(message.timestamp) ? new Date(Number(message.timestamp) * 1000) : null,
        mediaId: message.media?.id ?? null, mediaMimeType: message.media?.mimeType ?? null, mediaSha256: message.media?.sha256 ?? null,
      })),
    })
    return result.count
  }

  /**
   * Claims the oldest due message, skipping senders with a message already in flight so a
   * user's messages are handled in order (a correction never overtakes its expense).
   */
  async claimNext(now = new Date()): Promise<WhatsAppInboundMessage | null> {
    const candidates = await this.prisma.whatsAppInboundMessage.findMany({
      where: { OR: [{ status: { in: ['received', 'failed'] }, nextAttemptAt: { lte: now } }, { status: 'processing', leaseUntil: { lt: now } }] },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 20,
    })
    const busy = new Set<string>()
    for (const candidate of candidates) {
      if (busy.has(candidate.from)) continue
      const inFlight = await this.prisma.whatsAppInboundMessage.count({ where: { from: candidate.from, status: 'processing', leaseUntil: { gte: now }, id: { not: candidate.id } } })
      const earlier = await this.prisma.whatsAppInboundMessage.count({ where: { from: candidate.from, status: { in: ['received', 'failed'] }, createdAt: { lt: candidate.createdAt } } })
      if (inFlight || earlier) { busy.add(candidate.from); continue }
      const claimed = await this.prisma.whatsAppInboundMessage.updateMany({
        where: { id: candidate.id, status: candidate.status, attempts: candidate.attempts },
        data: { status: 'processing', attempts: { increment: 1 }, leaseUntil: new Date(now.getTime() + PROCESSING_LEASE_MS), processingStartedAt: now },
      })
      if (claimed.count === 1) return this.prisma.whatsAppInboundMessage.findUnique({ where: { id: candidate.id } })
    }
    return null
  }

  async complete(id: string, outcome: { reply: string; intent: string; profileId: string | null; result?: Record<string, unknown> }) {
    await this.prisma.whatsAppInboundMessage.updateMany({
      where: { id, status: 'processing' },
      data: {
        status: 'completed', completedAt: new Date(), leaseUntil: null, error: null, intent: outcome.intent,
        profileId: outcome.profileId, result: (outcome.result ?? {}) as object,
        replyText: outcome.reply.slice(0, 4096), replyStatus: 'pending', replyNextAttemptAt: new Date(),
      },
    })
  }

  /** Transient failure: retry with backoff; after the last attempt the message is dead and the user is told. */
  async fail(row: Pick<WhatsAppInboundMessage, 'id' | 'attempts' | 'type'>, error: unknown, deadReply: string) {
    const attempts = row.attempts
    if (attempts >= MAX_PROCESSING_ATTEMPTS) {
      await this.prisma.whatsAppInboundMessage.updateMany({
        where: { id: row.id, status: 'processing' },
        data: { status: 'dead', leaseUntil: null, error: safeError(error), replyText: deadReply, replyStatus: 'pending', replyNextAttemptAt: new Date() },
      })
      return 'dead' as const
    }
    await this.prisma.whatsAppInboundMessage.updateMany({
      where: { id: row.id, status: 'processing' },
      data: {
        status: 'failed', leaseUntil: null, error: safeError(error), nextAttemptAt: new Date(Date.now() + backoff(attempts)),
        ...(row.type === 'image' && attempts === 1 ? {
          replyText: 'Recibí la foto, pero la lectura está demorando. Voy a reintentar; todavía no registré ningún gasto.',
          replyStatus: 'pending', replyNextAttemptAt: new Date(),
        } : {}),
      },
    })
    return 'failed' as const
  }

  async claimReply(now = new Date()) {
    const row = await this.prisma.whatsAppInboundMessage.findFirst({
      where: { OR: [{ replyStatus: { in: ['pending', 'failed'] } }, { replyStatus: 'sending' }], replyNextAttemptAt: { lte: now } },
      orderBy: { replyNextAttemptAt: 'asc' },
    })
    if (!row) return null
    const claimed = await this.prisma.whatsAppInboundMessage.updateMany({
      where: { id: row.id, replyStatus: row.replyStatus, replyAttempts: row.replyAttempts },
      data: { replyStatus: 'sending', replyAttempts: { increment: 1 }, replyNextAttemptAt: new Date(now.getTime() + PROCESSING_LEASE_MS) },
    })
    return claimed.count === 1 ? { ...row, replyAttempts: row.replyAttempts + 1 } : null
  }

  async replySent(id: string, wamid: string | null) {
    await this.prisma.whatsAppInboundMessage.update({ where: { id }, data: { replyStatus: 'sent', replyWamid: wamid, replySentAt: new Date(), replyError: null, replyNextAttemptAt: null } })
  }

  async replyFailed(row: Pick<WhatsAppInboundMessage, 'id' | 'replyAttempts'>, error: unknown) {
    const dead = row.replyAttempts >= MAX_REPLY_ATTEMPTS
    await this.prisma.whatsAppInboundMessage.update({
      where: { id: row.id },
      data: { replyStatus: dead ? 'dead' : 'failed', replyError: safeError(error), replyNextAttemptAt: dead ? null : new Date(Date.now() + backoff(row.replyAttempts)) },
    })
  }

  /** Observable state for operators: counts per processing and reply status. */
  async health() {
    const [processing, replies] = await Promise.all([
      this.prisma.whatsAppInboundMessage.groupBy({ by: ['status'], _count: true }),
      this.prisma.whatsAppInboundMessage.groupBy({ by: ['replyStatus'], _count: true }),
    ])
    return {
      processing: Object.fromEntries(processing.map(row => [row.status, row._count])),
      replies: Object.fromEntries(replies.map(row => [row.replyStatus ?? 'none', row._count])),
    }
  }
}
