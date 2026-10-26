import { Injectable } from '@nestjs/common'
import { CorrectionIntakeService } from '../correction/correction-intake.service'
import type { CorrectionRequest } from '../correction/correction-patch'
import type { HandlerResult, InboundContext } from '../types'
import { applyDraftAnswer } from './draft-answer'
import { DraftRepository, type StoredDraft } from './draft.repository'
import { ExpenseIntakeService } from './expense-intake.service'
import type { IntakeProfileContext } from './intake-context.service'

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
    const answer = applyDraftAnswer(draft.pendingField, ctx.text, draft.proposal, draft.meta, ctx.localDate)
    if (answer.kind === 'cancel') {
      await this.drafts.close(draft.id, ctx.profileId, 'cancelled')
      return { reply: 'Listo, no registré ese gasto.', intent: 'cancel' }
    }
    if (answer.kind === 'not_understood') return { reply: `No te entendí. ${draft.question ?? ''}\n(o escribí "cancelar")`.trim(), intent: 'clarification', result: { draftId: draft.id } }
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
