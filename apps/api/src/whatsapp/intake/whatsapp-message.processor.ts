import { Injectable, Logger, Optional } from '@nestjs/common'
import type { WhatsAppInboundMessage } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { HELP_TEXT } from './constants'
import { LINK_COMMAND, ruleIntent } from './parsing/intent-rules'
import { localDateOf } from './parsing/local-date'
import { normalizePhone, WhatsAppLinkService, type LinkOutcome } from './link/whatsapp-link.service'
import { WhatsAppExtractorService } from './ai/whatsapp-extractor.service'
import type { TextExtraction } from './ai/extraction.schemas'
import { IntakeContextService, type IntakeProfileContext } from './expense/intake-context.service'
import { DraftRepository } from './expense/draft.repository'
import { ExpenseIntakeService } from './expense/expense-intake.service'
import { ReceiptIntakeService } from './expense/receipt-intake.service'
import { proposalFromText } from './expense/text-proposal'
import { CorrectionIntakeService } from './correction/correction-intake.service'
import { DraftResponder } from './expense/draft-responder'
import { correctionFromText } from './correction/correction-patch'
import { QueryIntakeService } from './queries/query-intake.service'
import { ChatFallback } from './chat-fallback'
import type { HandlerResult, InboundContext, IntakeIntent } from './types'
import { MediaHistoryService } from './media-history.service'

export type ProcessorOutcome = HandlerResult & { profileId: string | null }

const UNLINKED = 'Hola, soy Finnic. Este número no está vinculado a una cuenta, así que no puedo mostrar ni registrar información.\nPara vincularlo: en la app entrá a Perfil → WhatsApp, generá un código y enviame "vincular 123456" desde este teléfono.'
const LINK_REPLIES: Record<LinkOutcome, string> = {
  linked: '✅ Listo, este número quedó vinculado a tu cuenta de Finnic.\nYa podés escribirme "Gasté 850 pesos en el súper con débito" o mandarme la foto de un ticket.',
  invalid: 'El código no es válido o ya venció. Generá uno nuevo en Perfil → WhatsApp.',
  rate_limited: 'Hubo demasiados intentos fallidos. Esperá una hora y generá un código nuevo.',
  phone_taken: 'Este número ya está vinculado a otra cuenta. Desvinculalo desde esa cuenta antes de usarlo acá.',
}
const NEEDS_AI = new Set<IntakeIntent | null>([null, 'register_expense', 'correct_last'])

@Injectable()
export class WhatsAppMessageProcessor {
  private readonly logger = new Logger(WhatsAppMessageProcessor.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly links: WhatsAppLinkService,
    private readonly extractor: WhatsAppExtractorService,
    private readonly context: IntakeContextService,
    private readonly drafts: DraftRepository,
    private readonly expenses: ExpenseIntakeService,
    private readonly receipts: ReceiptIntakeService,
    private readonly corrections: CorrectionIntakeService,
    private readonly draftResponder: DraftResponder,
    private readonly queries: QueryIntakeService,
    private readonly chat: ChatFallback,
    @Optional() private readonly history?: MediaHistoryService,
  ) {}

  async handle(row: WhatsAppInboundMessage): Promise<ProcessorOutcome> {
    const text = row.body ?? ''
    // Only code-verified links count: a phone number alone never grants access.
    const linked = await this.prisma.profile.findFirst({ where: { whatsappPhone: normalizePhone(row.from), whatsappLinkedAt: { not: null } }, select: { id: true } })
    if (!linked) return { ...(await this.unlinked(row, text)), profileId: null }
    const profileId = linked.id
    const ctx: InboundContext = {
      inboundId: row.id, wamid: row.wamid, profileId, text,
      type: row.type === 'image' || row.type === 'sticker' || row.type === 'text' ? row.type : 'unsupported',
      localDate: localDateOf(row.messageTimestamp ?? row.createdAt), contextWamid: row.contextWamid,
      media: row.mediaId ? { id: row.mediaId, mimeType: row.mediaMimeType, sha256: row.mediaSha256 } : null,
    }
    return this.handleContext(ctx)
  }

  /** The authenticated app supplies its profile; WhatsApp still requires a verified phone link. */
  async handleContext(ctx: InboundContext): Promise<ProcessorOutcome> {
    const profileId = ctx.profileId
    await this.history?.prepare(ctx)
    const profile = await this.context.load(profileId)
    const replay = await this.replay(ctx, profile)
    const outcome = replay ?? await this.route(ctx, profile)
    await this.history?.save(ctx, outcome)
    return { ...outcome, profileId }
  }

  private async route(ctx: InboundContext, profile: IntakeProfileContext): Promise<HandlerResult> {
    if (LINK_COMMAND.test(ctx.text)) return { reply: 'Este número ya está vinculado a tu cuenta de Finnic.', intent: 'link' }
    if (ctx.type === 'sticker') return { reply: 'Te leo. Cuando quieras, seguimos con tus números.', intent: 'other' }
    if (ctx.type === 'unsupported') return { reply: 'Por ahora entiendo mensajes de texto y fotos de tickets (JPG, PNG o WebP). No registré nada.', intent: 'other' }
    if (ctx.type === 'image') return this.receipts.handle(ctx, profile)

    let intent = ruleIntent(ctx.text)
    const draft = await this.drafts.findOpen(ctx.profileId)
    if (draft && (intent === null || intent === 'cancel')) return this.draftResponder.answer(ctx, draft, profile, intent === 'cancel')
    if (intent === 'cancel') return { reply: 'No hay nada pendiente para cancelar.', intent: 'cancel' }

    const ai = NEEDS_AI.has(intent) ? await this.extract(ctx, profile) : null
    // A classifier's generic "help" must not replace an open conversation with a menu.
    intent = intent ?? (ai?.intent === 'help' ? 'other' : ai?.intent) ?? 'other'
    switch (intent) {
      case 'register_expense': return this.expenses.continue(ctx, proposalFromText(ctx.text, ai, profile, ctx.localDate), profile)
      case 'correct_last':
      case 'undo_last': {
        const request = intent === 'correct_last' ? correctionFromText(ctx.text, ai, ctx.localDate, profile.accounts.map(a => a.name)) : undefined
        const target = await this.corrections.target(ctx, undefined, request?.fxRate ? profile.planCurrency ?? undefined : undefined)
        if (target.kind === 'none') return { reply: 'No encontré un gasto registrado por WhatsApp en las últimas 24 horas para modificar.', intent }
        if (target.kind === 'ambiguous') return this.corrections.askWhich(ctx, target.options, { action: intent === 'undo_last' ? 'undo' : 'correct', request })
        return intent === 'undo_last' ? this.corrections.applyUndo(ctx, target.expense) : this.corrections.applyCorrection(ctx, target.expense, request!, profile)
      }
      case 'query_month_spending': return this.queries.monthSpending(ctx)
      case 'query_spending_capacity': return this.queries.capacity(ctx, ai)
      case 'query_can_afford': return this.queries.canAfford(ctx, ai)
      case 'query_savings': return this.queries.savings(ctx)
      case 'help': return { reply: HELP_TEXT, intent: 'help' }
      default: return this.chat.reply(ctx)
    }
  }

  /** A retried message whose write already committed answers from the audit row, never re-executing. */
  private async replay(ctx: InboundContext, profile: IntakeProfileContext): Promise<HandlerResult | null> {
    const action = await this.prisma.whatsAppExpenseAction.findUnique({ where: { inboundId: ctx.inboundId } })
    if (!action) return null
    if (action.kind === 'undo') return { reply: 'Ese gasto ya fue deshecho.', intent: 'undo_last', result: { undoneExpenseId: action.expenseId } }
    const reply = await this.expenses.confirmation(action.expenseId!, ctx.profileId, profile)
    return action.kind === 'correct'
      ? { reply: reply.replace('✅ Registré', '✏️ Corregido:'), intent: 'correct_last', result: { expenseId: action.expenseId } }
      : { reply, intent: 'register_expense', result: { expenseId: action.expenseId } }
  }

  private async extract(ctx: InboundContext, profile: IntakeProfileContext): Promise<TextExtraction | null> {
    try {
      return await this.extractor.extractText({ text: ctx.text, today: ctx.localDate, budgetCategories: profile.budgetCategories.map(c => c.name), accountNames: profile.accounts.filter(a => a.purpose === 'OPERATING').map(a => a.name) })
    } catch {
      // Deterministic rules still validate amount, currency and account without the AI.
      this.logger.warn({ event: 'whatsapp_extraction_unavailable', inboundId: ctx.inboundId })
      return null
    }
  }

  private async unlinked(row: WhatsAppInboundMessage, text: string): Promise<HandlerResult> {
    const match = LINK_COMMAND.exec(text)
    if (!match) return { reply: UNLINKED, intent: 'other' }
    const failures = await this.prisma.whatsAppInboundMessage.count({ where: { from: row.from, intent: 'link_failed', createdAt: { gte: new Date(Date.now() - 3_600_000) } } })
    const outcome = await this.links.consume(match[1]!, row.from, failures)
    return { reply: LINK_REPLIES[outcome], intent: outcome === 'linked' ? 'link' : 'link_failed' }
  }
}
