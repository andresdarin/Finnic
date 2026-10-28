import { Injectable } from '@nestjs/common'
import { CorrectionIntakeService } from '../correction/correction-intake.service'
import type { CorrectionRequest } from '../correction/correction-patch'
import type { HandlerResult, InboundContext } from '../types'
import { applyDraftAnswer } from './draft-answer'
import { DraftRepository, type StoredDraft } from './draft.repository'
import { ExpenseIntakeService } from './expense-intake.service'
import type { IntakeProfileContext } from './intake-context.service'
import { correctReceiptItem } from './receipt-item-correction'
import { movementDirection } from './movement-direction'

type WhichExpense = { pending: { action: 'correct' | 'undo'; request?: CorrectionRequest }; options: string[] }

/** Continues an open clarification with the user's reply; the draft keeps the origin wamid. */
@Injectable()
export class DraftResponder {
  constructor(
    private readonly drafts: DraftRepository,
    private readonly expenses: ExpenseIntakeService,
    private readonly corrections: CorrectionIntakeService,
  ) {}

  async answer(ctx: InboundContext, draft: StoredDraft, profile: IntakeProfileContext, cancel: boolean): Promise<HandlerResult> {
    if (cancel) {
      await this.drafts.close(draft.id, ctx.profileId, 'cancelled')
      return { reply: 'Listo, no registré nada.', intent: 'cancel' }
    }
    if (draft.pendingField === 'which_expense') return this.whichExpense(ctx, draft, profile)
    if (draft.proposal.transferDocument && movementDirection(ctx.text) === 'OWN') {
      await this.drafts.close(draft.id, ctx.profileId, 'cancelled')
      return { reply: 'Entre tus cuentas no es ingreso ni gasto. No lo registré como tal; podés cargar esa transferencia entre cuentas desde Balance.', intent: 'other' }
    }
    if (draft.proposal.transferDocument && draft.pendingField === 'receipt_confirmation') {
      const direction = movementDirection(ctx.text)
      if (direction === 'INCOME' || direction === 'EXPENSE') return this.expenses.continue(ctx, { ...draft.proposal, movementType: direction, receiptConfirmed: false }, profile, draft)
    }
    if (draft.pendingField === 'receipt_confirmation' && /^revisar$/i.test(ctx.text.trim())) return this.expenses.continue(ctx, { ...draft.proposal, receiptConfirmed: false }, profile, draft)
    if (draft.pendingField === 'receipt_confirmation') {
      const correction = correctReceiptItem(ctx.text, draft.proposal)
      if (correction?.kind === 'ask') return { reply: correction.question, intent: 'clarification', result: { draftId: draft.id } }
      if (correction?.kind === 'updated') return this.expenses.continue(ctx, correction.proposal, profile, draft, ['Corregí el detalle. Revisá que los productos y el total coincidan con el ticket.'])
    }
    const answer = applyDraftAnswer(draft.pendingField, ctx.text, draft.proposal, draft.meta, ctx.localDate)
    if (answer.kind === 'cancel') {
      await this.drafts.close(draft.id, ctx.profileId, 'cancelled')
      return { reply: `Listo, no registré ese ${draft.proposal.transferDocument ? 'movimiento' : 'gasto'}.`, intent: 'cancel' }
    }
    if (answer.kind === 'not_understood') {
      const options = draft.meta.options ?? []
      const reply = draft.pendingField === 'account' && options.length
        ? `No te entendí. ¿Fue ${options.map(option => option.label ?? option.name).join(' o ')}? Si querés, lo dejo sin cuenta.`
        : `Perdón, no te entendí. ${draft.question ?? '¿Me lo decís de otra forma?'}`
      return { reply, intent: 'clarification', result: { draftId: draft.id } }
    }
    return this.expenses.continue(ctx, answer.proposal, profile, draft)
  }

  private async whichExpense(ctx: InboundContext, draft: StoredDraft, profile: IntakeProfileContext): Promise<HandlerResult> {
    const stored = draft.proposal as unknown as WhichExpense
    const index = /^\s*(\d)\s*$/.exec(ctx.text)
    const expenseId = index ? stored.options[Number(index[1]) - 1] : undefined
    if (!expenseId) return { reply: `Respondé con el número del gasto. ${draft.question ?? ''}`.trim(), intent: 'clarification', result: { draftId: draft.id } }
    await this.drafts.close(draft.id, ctx.profileId, 'completed', expenseId)
    const target = await this.corrections.target(ctx, expenseId)
    if (target.kind !== 'found') return { reply: 'Ese gasto ya no existe; no cambié nada.', intent: 'correct_last' }
    return stored.pending.action === 'undo'
      ? this.corrections.applyUndo(ctx, target.expense)
      : this.corrections.applyCorrection(ctx, target.expense, stored.pending.request ?? {}, profile)
  }
}
