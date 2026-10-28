import { ConflictException, Injectable } from '@nestjs/common'
import { isDeepStrictEqual } from 'node:util'
import { normalizeText } from '../parsing/signals'
import type { InboundContext } from '../types'
import { DraftRepository, type StoredDraft } from './draft.repository'
import { IntakeContextService } from './intake-context.service'
import { AccountOnboardingService } from './account-onboarding.service'
import { ExpenseIntakeService } from './expense-intake.service'

/** A semantic confirmation can execute only the immutable proposal visible at turn start. */
@Injectable()
export class DraftConfirmationService {
  constructor(private readonly drafts: DraftRepository, private readonly context: IntakeContextService, private readonly accounts: AccountOnboardingService, private readonly expenses: ExpenseIntakeService) {}

  async confirm(ctx: InboundContext, expected: StoredDraft) {
    const text = normalizeText(ctx.text)
    if (ctx.fromAudio || /\?/.test(ctx.text) || /\b(?:no|quizas|tal vez|pero|cambia|cambiar|corregi|antes|siempre que|si fuera|si fuese)\b/.test(text)) throw new ConflictException('No hay una confirmación inequívoca; aclarar antes de ejecutar.')
    const draft = await this.drafts.findOpen(ctx.profileId)
    if (draft?.meta.accountConfirmationInboundId && draft.meta.accountConfirmationInboundId === ctx.inboundId) return { reply: draft.question ?? 'La cuenta ya está agregada; el gasto sigue pendiente.' }
    if (!draft || draft.id !== expected.id || !isDeepStrictEqual({ proposal: draft.proposal, meta: draft.meta, question: draft.question }, { proposal: expected.proposal, meta: expected.meta, question: expected.question })) throw new ConflictException('La propuesta cambió. Mostrá la propuesta actual antes de confirmar.')
    const profile = await this.context.load(ctx.profileId)
    if (draft.meta.accountCreation?.stage === 'confirm') {
      const result = await this.accounts.answer({ ...ctx, text: 'sí' }, draft, profile)
      if (!result) throw new ConflictException('El alta no está lista para confirmar.')
      return { data: { confirmed: 'account', expenseStillPending: true }, reply: result.reply }
    }
    if (draft.pendingField === 'receipt_confirmation') {
      const result = await this.expenses.continue(ctx, { ...draft.proposal, receiptConfirmed: true }, profile, draft)
      return { data: result.result, reply: result.reply }
    }
    if (draft.pendingField === 'duplicate') {
      const result = await this.expenses.continue(ctx, { ...draft.proposal, duplicateAcknowledged: true }, profile, draft)
      return { data: result.result, reply: result.reply }
    }
    throw new ConflictException('Todavía faltan datos; no hay una propuesta que confirmar.')
  }
}
