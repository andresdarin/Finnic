import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type PersonalExpense } from '@prisma/client'
import { PrismaService } from '../../../prisma/prisma.service'
import { CorrectExpenseUseCase, type ExpenseAudit } from '../../../finance/application/correct-expense.usecase'
import { UndoExpenseUseCase } from '../../../finance/application/undo-expense.usecase'
import { AMBIGUOUS_CORRECTION_GAP_MS, CORRECTION_WINDOW_MS } from '../constants'
import { resolveAccount } from '../parsing/account-resolution'
import { formatDate, formatMoney, optionList } from '../reply/format'
import { purchaseInstant } from '../parsing/local-date'
import type { HandlerResult, InboundContext } from '../types'
import { DraftRepository } from '../expense/draft.repository'
import { ExpenseIntakeService } from '../expense/expense-intake.service'
import type { IntakeProfileContext } from '../expense/intake-context.service'
import { isEmptyCorrection, type CorrectionRequest } from './correction-patch'

type Target = { kind: 'found'; expense: PersonalExpense } | { kind: 'none' } | { kind: 'ambiguous'; options: PersonalExpense[] }
const describe = (row: PersonalExpense) => `${formatMoney(row.amount.toFixed(2), row.currency)} · ${row.title} · ${formatDate(row.date.toISOString())}`

/** Corrections and undo apply only to expenses this user created through WhatsApp. */
@Injectable()
export class CorrectionIntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly correct: CorrectExpenseUseCase,
    private readonly undo: UndoExpenseUseCase,
    private readonly drafts: DraftRepository,
    private readonly expenses: ExpenseIntakeService,
  ) {}

  /** `onlyCurrencyOtherThan` narrows candidates to those a correction can apply to (FX quotes). */
  async target(ctx: InboundContext, explicitExpenseId?: string, onlyCurrencyOtherThan?: string): Promise<Target> {
    const base = { profileId: ctx.profileId, movementType: 'EXPENSE' as const, source: ctx.channel === 'app' ? 'web' : 'whatsapp' }
    if (explicitExpenseId) {
      const expense = await this.prisma.personalExpense.findFirst({ where: { ...base, id: explicitExpenseId } })
      return expense ? { kind: 'found', expense } : { kind: 'none' }
    }
    if (ctx.contextWamid) {
      // The user replied to a specific confirmation: no ambiguity.
      const quoted = await this.prisma.whatsAppInboundMessage.findFirst({ where: { profileId: ctx.profileId, OR: [{ replyWamid: ctx.contextWamid }, { wamid: ctx.contextWamid }] } })
      const expenseId = (quoted?.result as { expenseId?: string } | null)?.expenseId
      if (expenseId) {
        const expense = await this.prisma.personalExpense.findFirst({ where: { ...base, id: expenseId } })
        if (expense) return { kind: 'found', expense }
      }
    }
    const recent = await this.prisma.personalExpense.findMany({
      where: { ...base, createdAt: { gte: new Date(Date.now() - CORRECTION_WINDOW_MS) }, ...(onlyCurrencyOtherThan ? { currency: { not: onlyCurrencyOtherThan } } : {}) },
      orderBy: { createdAt: 'desc' }, take: 3,
    })
    if (!recent.length) return { kind: 'none' }
    const [latest, previous] = recent
    if (previous && latest!.createdAt.getTime() - previous.createdAt.getTime() < AMBIGUOUS_CORRECTION_GAP_MS) {
      return { kind: 'ambiguous', options: recent.filter(row => latest!.createdAt.getTime() - row.createdAt.getTime() < AMBIGUOUS_CORRECTION_GAP_MS) }
    }
    return { kind: 'found', expense: latest! }
  }

  async askWhich(ctx: InboundContext, options: PersonalExpense[], pending: { action: 'correct' | 'undo'; request?: CorrectionRequest }) {
    const question = `¿A cuál gasto te referís?\n${optionList(options.map(describe))}\nRespondé con el número.`
    await this.drafts.save({
      profileId: ctx.profileId, sourceInboundId: ctx.inboundId, sourceWamid: ctx.wamid, field: 'which_expense', question,
      proposal: { pending, options: options.map(row => row.id) } as never,
    })
    return { reply: question, intent: 'clarification' as const }
  }

  async applyCorrection(ctx: InboundContext, expense: PersonalExpense, request: CorrectionRequest, profile: IntakeProfileContext): Promise<HandlerResult> {
    if (isEmptyCorrection(request)) return { reply: '¿Qué querés corregir? Por ejemplo: "eran 580", "fue en efectivo", "fue ayer" o "cotización 40,25".', intent: 'correct_last' }
    const patch: Record<string, unknown> = {}
    if (request.amount) patch.amount = request.amount
    if (request.date) patch.date = purchaseInstant(request.date)
    const currency = request.currency ?? expense.currency
    if (request.currency && request.currency !== expense.currency) patch.currency = request.currency
    if (request.fxRate) {
      if (!profile.planCurrency || profile.planCurrency === expense.currency) return { reply: `El gasto ya está en la moneda de tu plan (${expense.currency}); no hace falta cotización.`, intent: 'correct_last' }
      patch.fxRate = { toCurrency: profile.planCurrency, rate: request.fxRate }
    }
    if (request.paymentMethod || request.accountHint || patch.currency) {
      const resolution = resolveAccount({ accounts: profile.accounts, currency: currency as 'UYU' | 'USD', method: request.paymentMethod ?? null, hint: request.accountHint ?? null, defaultAccountId: null })
      if (resolution.status === 'ASK') {
        if (!resolution.options.length) return { reply: `No tenés una cuenta en ${currency} que coincida. No cambié nada.`, intent: 'correct_last' }
        return { reply: `¿Qué cuenta uso?\n${optionList(resolution.options.map(a => `${a.name} (${a.currency})`))}\nRespondé, por ejemplo, "fue con ${resolution.options[0]!.name}". No cambié nada todavía.`, intent: 'correct_last' }
      }
      patch.financeAccountId = resolution.account?.id ?? null
    }
    try {
      await this.correct.execute({ profileId: ctx.profileId, expenseId: expense.id, patch, audit: this.audit(ctx, 'correct') })
    } catch (error) {
      if (this.isDuplicateAction(error)) return this.replay(ctx, expense.id, profile)
      if (error instanceof BadRequestException || error instanceof NotFoundException) return { reply: `No pude corregirlo: ${error.message} No cambié nada.`, intent: 'correct_last' }
      throw error
    }
    return { reply: (await this.expenses.confirmation(expense.id, ctx.profileId, profile)).replace('✅ Registré', '✏️ Corregido:'), intent: 'correct_last', result: { expenseId: expense.id } }
  }

  async applyUndo(ctx: InboundContext, expense: PersonalExpense): Promise<HandlerResult> {
    try {
      await this.undo.execute({ profileId: ctx.profileId, expenseId: expense.id, audit: this.audit(ctx, 'undo') })
    } catch (error) {
      if (this.isDuplicateAction(error)) return { reply: 'Ese gasto ya estaba deshecho.', intent: 'undo_last' }
      if (error instanceof NotFoundException) return { reply: 'Ese gasto ya no existe; no cambié nada.', intent: 'undo_last' }
      throw error
    }
    const account = expense.financeAccountId ? ' y revertí su efecto en la cuenta' : ''
    return { reply: `🗑️ Deshice el gasto ${describe(expense)}${account}.`, intent: 'undo_last', result: { undoneExpenseId: expense.id } }
  }

  /** Audit row is written inside the write transaction; its unique inboundId makes retries no-ops. */
  private audit(ctx: InboundContext, kind: 'correct' | 'undo'): ExpenseAudit {
    return async (tx, before, after) => {
      await tx.whatsAppExpenseAction.create({ data: { profileId: ctx.profileId, inboundId: ctx.inboundId, expenseId: before.id, kind, before, after: after ?? Prisma.DbNull } })
    }
  }

  private isDuplicateAction(error: unknown) { return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' }

  private async replay(ctx: InboundContext, expenseId: string, profile: IntakeProfileContext): Promise<HandlerResult> {
    return { reply: (await this.expenses.confirmation(expenseId, ctx.profileId, profile)).replace('✅ Registré', '✏️ Corregido:'), intent: 'correct_last', result: { expenseId } }
  }
}
