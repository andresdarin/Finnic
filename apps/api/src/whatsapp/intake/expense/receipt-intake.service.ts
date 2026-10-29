import { BadRequestException, Injectable, Optional } from '@nestjs/common'
import { CorrectionIntakeService } from '../correction/correction-intake.service'
import { explicitDate } from '../parsing/explicit-date'
import { hasDateSignal } from '../parsing/signals'
import { dateFromText } from './text-proposal'
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
  UNSUPPORTED_MEDIA_TYPE: 'Puedo leer PDF y fotos JPG, PNG o WebP. No registré nada.',
  MEDIA_TOO_LARGE: 'El archivo supera los 5 MB. Mandalo más liviano. No registré nada.',
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
    @Optional() private readonly corrections?: CorrectionIntakeService,
  ) {}

  async handle(ctx: InboundContext, profile: IntakeProfileContext): Promise<HandlerResult> {
    const replacing = /correg[ií]|corregir|corrige|reemplaz|en (?:lugar|vez) de|actualiz|(?:este|el) es el (?:correcto|verdadero)/i.test(ctx.text)
    if (!ctx.media && !ctx.attachment) return { reply: 'No recibí el archivo. Probá enviarlo de nuevo.', intent: 'other' }
    let media: Awaited<ReturnType<WhatsAppClient['downloadMedia']>>
    try {
      media = ctx.attachment ?? await this.client.downloadMedia(ctx.media!.id, { maxBytes: MAX_MEDIA_BYTES, allowedTypes: ALLOWED_MEDIA_TYPES })
    } catch (error) {
      const message = error instanceof BadRequestException ? MEDIA_ERRORS[String(error.message)] : undefined
      if (message) return { reply: message, intent: 'other', result: { mediaRejected: error instanceof Error ? error.message : 'invalid' } }
      throw error // transient: retried by the worker
    }
    await this.prisma.whatsAppInboundMessage.update({ where: { id: ctx.inboundId }, data: { mediaSha256: media.sha256, mediaSize: media.bytes.length, mediaMimeType: media.mimeType } })
    ctx.attachment = media

    let reading: Awaited<ReturnType<WhatsAppExtractorService['extractReceipt']>>
    try {
      reading = await this.extractor.extractReceipt({ image: media.bytes, mimeType: media.mimeType, caption: ctx.text, today: ctx.localDate })
    } catch (error) {
      if (ctx.type === 'document' && error instanceof BadRequestException) return { reply: 'No pude abrir ese PDF. Probá una copia sin contraseña o una foto legible del comprobante. No guardé nada.', intent: 'other' }
      throw error
    }
    if (replacing && (!reading?.isReceipt || reading.documentKind === 'transfer' || reading.documentKind === 'financial')) return { reply: 'No pude leer un ticket válido para corregir el gasto. Mandame una foto legible o escribime el total final. No creé otro gasto.', intent: 'correct_last' }
    if (reading?.documentKind === 'financial') return { reply: reading.summary || 'Es un documento financiero. Qué querés revisar de él? No registré ningún movimiento.', intent: 'other' }
    if (reading?.documentKind === 'transfer') {
      if (reading.paymentStatus === 'pending' || reading.paymentStatus === 'failed') return { reply: 'El comprobante indica una transferencia pendiente o rechazada. No la registré como un movimiento realizado; mandame el comprobante cuando esté completada.', intent: 'other' }
      if ((reading.movementCount ?? 1) > 1) return { reply: 'Veo varios movimientos. Mandame el comprobante de uno solo para registrarlo por separado. No guardé nada.', intent: 'other' }
      const built = proposalFromReceipt({ ...reading, isReceipt: true, items: [], totalCandidates: reading.totalCandidates ?? [] }, '', profile, ctx.localDate, media.sha256)
      built.proposal.transferDocument = true
      built.proposal.paymentMethod = 'TRANSFER'
      built.proposal.title = 'Transferencia'
      built.proposal.date = reading.date && built.proposal.date === reading.date ? reading.date : null
      built.proposal.currency = reading.currency ?? null
      built.proposal.currencyConflict = !reading.currency
      return this.expenses.continue(ctx, built.proposal, profile)
    }
    if (!reading) {
      if (ctx.type === 'document') return { reply: 'No pude leer el PDF. Si está protegido, mandame una copia sin contraseña o una foto legible del comprobante. No guardé nada.', intent: 'other' }
      const draft = await this.drafts.save({
        profileId: ctx.profileId, sourceInboundId: ctx.inboundId, sourceWamid: ctx.wamid, field: 'amount',
        question: 'No pude leer el ticket. ¿Cuál fue el total pagado?',
        proposal: { amount: null, currency: null, title: 'Ticket', merchant: null, date: ctx.localDate, category: 'otros_variables', budgetCategoryId: null, paymentMethod: null, accountHint: null, financeAccountId: null, accountless: false, inputMethod: 'RECEIPT_SCAN', receipt: { sha256: media.sha256, subtotal: null, confidence: null } },
      })
      return { reply: draft.question ?? '', intent: 'clarification', result: { draftId: draft.id, pendingField: 'amount' } }
    }
    if (!reading.isReceipt) return { reply: 'No parece un comprobante financiero que pueda registrar. No guardé nada. Si querés, contame qué necesitás revisar de tus finanzas.', intent: 'other' }

    const built = proposalFromReceipt(reading, ctx.text, profile, ctx.localDate, media.sha256)
    // A replacement receipt updates an existing movement; it never enters the create flow.
    if (replacing) {
      if (!this.corrections) return { reply: 'No pude preparar la corrección. No creé otro gasto.', intent: 'correct_last' }
      if (built.ambiguity || !built.proposal.amount) return { reply: 'No pude identificar el total final con seguridad. Escribime cuánto pagaste para corregir el gasto existente. No creé otro gasto.', intent: 'correct_last' }
      const date = explicitDate(ctx.text, ctx.localDate) || hasDateSignal(ctx.text) ? dateFromText(ctx.text, ctx.localDate, null) : null
      if (date === 'ASK') return { reply: 'Qué fecha debe tener el gasto? Escribila como día/mes/año. No cambié nada ni creé otro gasto.', intent: 'correct_last' }
      const request = { amount: built.proposal.amount, ...(date ? { date } : {}) }
      const target = await this.corrections.target(ctx)
      if (target.kind === 'none') return { reply: 'No encontré el gasto original para corregir. Respondé al mensaje de confirmación de ese gasto con este comprobante. No creé otro gasto.', intent: 'correct_last' }
      if (target.kind === 'ambiguous') return this.corrections.askWhich(ctx, target.options, { action: 'correct', request })
      return this.corrections.applyCorrection(ctx, target.expense, request, profile)
    }
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
