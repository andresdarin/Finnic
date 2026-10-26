import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import { WhatsAppClient } from '../../whatsapp-client.service'
import { WhatsAppExtractorService } from '../ai/whatsapp-extractor.service'
import { ALLOWED_MEDIA_TYPES, MAX_MEDIA_BYTES } from '../constants'
import { formatMoney, optionList } from '../reply/format'
import type { HandlerResult, InboundContext } from '../types'
import { DraftRepository } from './draft.repository'
import { ExpenseIntakeService } from './expense-intake.service'
import type { IntakeProfileContext } from './intake-context.service'
import { proposalFromReceipt } from './receipt-proposal'

const MEDIA_ERRORS: Record<string, string> = {
  UNSUPPORTED_MEDIA_TYPE: 'Solo puedo leer fotos de tickets en JPG, PNG o WebP. No registré nada.',
  MEDIA_TOO_LARGE: 'La imagen supera los 5 MB. Mandala con menos resolución. No registré nada.',
  MEDIA_INTEGRITY: 'La imagen llegó dañada. Probá enviarla de nuevo. No registré nada.',
}

/** A photo is only a capture method: the result is one ordinary expense (or a question). */
@Injectable()
export class ReceiptIntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly client: WhatsAppClient,
    private readonly extractor: WhatsAppExtractorService,
    private readonly expenses: ExpenseIntakeService,
    private readonly drafts: DraftRepository,
  ) {}

  async handle(ctx: InboundContext, profile: IntakeProfileContext): Promise<HandlerResult> {
    if (!ctx.media) return { reply: 'No recibí la imagen. Probá enviarla de nuevo.', intent: 'other' }
    let media: Awaited<ReturnType<WhatsAppClient['downloadMedia']>>
    try {
      media = await this.client.downloadMedia(ctx.media.id, { maxBytes: MAX_MEDIA_BYTES, allowedTypes: ALLOWED_MEDIA_TYPES })
    } catch (error) {
      const message = error instanceof BadRequestException ? MEDIA_ERRORS[String(error.message)] : undefined
      if (message) return { reply: message, intent: 'other', result: { mediaRejected: error instanceof Error ? error.message : 'invalid' } }
      throw error // transient: retried by the worker
    }
    await this.prisma.whatsAppInboundMessage.update({ where: { id: ctx.inboundId }, data: { mediaSha256: media.sha256, mediaSize: media.bytes.length, mediaMimeType: media.mimeType } })

    const reading = await this.extractor.extractReceipt({ image: media.bytes, mimeType: media.mimeType, caption: ctx.text, today: ctx.localDate })
    if (!reading) {
      const draft = await this.drafts.save({
        profileId: ctx.profileId, sourceInboundId: ctx.inboundId, sourceWamid: ctx.wamid, field: 'amount',
        question: 'No pude leer el ticket. ¿Cuál fue el total pagado?',
        proposal: { amount: null, currency: null, title: 'Ticket', merchant: null, date: ctx.localDate, category: 'otros_variables', budgetCategoryId: null, paymentMethod: null, accountHint: null, financeAccountId: null, accountless: false, inputMethod: 'RECEIPT_SCAN', receipt: { sha256: media.sha256, subtotal: null, confidence: null } },
      })
      return { reply: draft.question ?? '', intent: 'clarification', result: { draftId: draft.id, pendingField: 'amount' } }
    }
    if (!reading.isReceipt) return { reply: 'La imagen no parece un ticket de compra, así que no registré nada. Si querés anotar un gasto, escribime el importe y en qué fue.', intent: 'other' }

    const built = proposalFromReceipt(reading, ctx.text, profile, ctx.localDate, media.sha256)
    if (built.ambiguity) {
      const currency = built.proposal.currency ?? profile.defaultCurrency ?? 'UYU'
      const options = built.amountOptions.length > 1
        ? `\n${optionList(built.amountOptions.map(value => formatMoney(value, currency)))}\nRespondé con el número o escribí el total correcto.`
        : '\nEscribime el total que pagaste.'
      const question = `${built.ambiguity}${options}`
      const draft = await this.drafts.save({ profileId: ctx.profileId, sourceInboundId: ctx.inboundId, sourceWamid: ctx.wamid, field: 'amount', question, proposal: built.proposal, meta: { amountOptions: built.amountOptions } })
      return { reply: question, intent: 'clarification', result: { draftId: draft.id, pendingField: 'amount' } }
    }
    return this.expenses.continue(ctx, built.proposal, profile, undefined, built.notes)
  }
}
