import { ConflictException, Injectable } from '@nestjs/common'
import { DraftRepository } from './draft.repository'
import { IntakeContextService } from './intake-context.service'
import { ExpenseIntakeService } from './expense-intake.service'
import { accountQuestion } from './account-onboarding'
import type { InboundContext } from '../types'

@Injectable()
export class DraftRecoveryService {
  constructor(private readonly drafts: DraftRepository, private readonly context: IntakeContextService, private readonly expenses: ExpenseIntakeService) {}
  async resume(ctx: InboundContext, draftId: string) {
    if (ctx.fromAudio) throw new ConflictException('Retomá el gasto por escrito.')
    const target = await this.drafts.findOwned(ctx.profileId, draftId)
    if (!target || target.registered || target.status === 'completed') throw new ConflictException('Ese borrador no está disponible para retomar o ya fue registrado.')
    const draft = target.draft
    const proposal = { ...draft.proposal, receiptConfirmed: false, confirmationRequired: true }
    if (draft.meta.accountCreation) {
      const question = accountQuestion(draft.meta.accountCreation)
      await this.drafts.save({ profileId: ctx.profileId, sourceInboundId: draft.sourceInboundId, sourceWamid: draft.sourceWamid, field: 'account', question, proposal, meta: draft.meta })
      return { reply: `Retomamos ${proposal.title}. ${question}` }
    }
    const profile = await this.context.load(ctx.profileId)
    const result = await this.expenses.continue(ctx, proposal, profile, { ...draft, proposal }, [`Retomamos ${proposal.title}.`])
    return { reply: result.reply, data: result.result }
  }
}
