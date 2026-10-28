import { ConflictException, Injectable } from '@nestjs/common'
import { z } from 'zod'
import type { ScopedDraftTools } from '../../../ai/agent/scoped-draft-tools'
import type { InboundContext } from '../types'
import { DraftRepository, type StoredDraft } from './draft.repository'
import { IntakeContextService } from './intake-context.service'
import { ExpenseIntakeService } from './expense-intake.service'
import { compatibleAccount, matchesName } from '../parsing/account-resolution'
import { draftPatchDeclaration, draftPatchSchema, type DraftPatch } from './draft-tool.schema'
import { accountQuestion, type AccountOnboarding } from './account-onboarding'
import { calculatePurchase } from '../parsing/purchase-calculation'

@Injectable()
export class DraftAgentToolsService {
  constructor(private readonly drafts: DraftRepository, private readonly context: IntakeContextService, private readonly expenses: ExpenseIntakeService) {}

  forRequest(ctx: InboundContext, expected: StoredDraft): ScopedDraftTools {
    const current = async () => {
      const draft = await this.drafts.findOpen(ctx.profileId)
      if (!draft || draft.id !== expected.id) throw new ConflictException('El borrador cambió o venció. Consultá el estado actual.')
      return draft
    }
    return {
      get_pending_expense: { declaration: { name: 'get_pending_expense', description: 'Consulta el gasto y alta de cuenta pendientes reales, productos, importes y próximo dato. No modifica nada.', parameters: { type: 'object', properties: {} } }, schema: z.object({}).strict(), execute: async () => { const draft = await current(); return { data: { proposal: draft.proposal, accountSetup: draft.meta.accountCreation, pendingField: draft.pendingField, question: draft.question } } } },
      update_pending_expense: { declaration: draftPatchDeclaration, schema: draftPatchSchema, execute: async args => this.update(ctx, await current(), draftPatchSchema.parse(args)) },
    }
  }

  private async update(ctx: InboundContext, draft: StoredDraft, patch: DraftPatch) {
    if (ctx.fromAudio) throw new ConflictException('Las modificaciones pendientes deben enviarse por escrito.')
    const profile = await this.context.load(ctx.profileId)
    const knownSetup = draft.meta.accountCreation
    const knownMethod = knownSetup && !knownSetup.needsType && knownSetup.stage !== 'offer' ? knownSetup.type === 'CREDIT' ? 'CREDIT' as const : knownSetup.type === 'CASH' ? 'CASH' as const : 'DEBIT' as const : draft.proposal.paymentMethod
    const proposal = { ...draft.proposal, amount: patch.amount ?? draft.proposal.amount, currency: patch.currency ?? draft.proposal.currency, paymentMethod: patch.paymentMethod ?? knownMethod, accountHint: patch.accountName ?? draft.proposal.accountHint, receiptConfirmed: false, confirmationRequired: true }
    if (patch.calculation) {
      const calculated = calculatePurchase(patch.calculation.quantity, patch.calculation.unitPrice, patch.calculation.discountPercent)
      if (!calculated || patch.amount && patch.amount !== calculated.total) throw new ConflictException('Los datos no permiten calcular un total consistente.')
      proposal.amount = calculated.total; proposal.calculation = calculated
    }
    if ((patch.amount || patch.calculation) && proposal.amount !== draft.proposal.amount && proposal.inputMethod === 'RECEIPT_SCAN') proposal.receiptItemsEdited = true
    const meta = { ...draft.meta }
    if (patch.accountName || patch.paymentMethod || patch.currency) proposal.financeAccountId = null
    if (patch.accountless === true) {
      proposal.accountless = true; proposal.financeAccountId = null; delete meta.accountCreation
    } else {
      if (patch.accountless === false || patch.accountName) proposal.accountless = false
      const matches = proposal.accountHint && proposal.currency ? profile.accounts.filter(a => compatibleAccount(a, proposal.currency!, proposal.paymentMethod) && matchesName(a, proposal.accountHint!)) : []
      if (matches.length === 1) { proposal.financeAccountId = matches[0]!.id; proposal.accountHint = matches[0]!.name; delete meta.accountCreation }
      else if (patch.prepareAccount || meta.accountCreation || patch.openingBalance !== undefined || patch.startFromNow) {
        const old = meta.accountCreation
        const setup: AccountOnboarding = { ...old, name: patch.accountName ?? old?.name ?? proposal.accountHint ?? undefined, currency: proposal.currency ?? undefined, type: proposal.paymentMethod === 'CREDIT' ? 'CREDIT' : proposal.paymentMethod === 'CASH' ? 'CASH' : 'BANK', needsType: !proposal.paymentMethod || proposal.paymentMethod === 'CARD', stage: 'offer' }
        if (patch.openingBalance !== undefined) { setup.initialBalance = patch.openingBalance; setup.prospective = false }
        if (patch.startFromNow) { setup.initialBalance = '0.00'; setup.prospective = true }
        // Preparing a concrete proposal is reversible; only a later human confirmation creates the account.
        const consent = patch.prepareAccount || patch.openingBalance !== undefined || patch.startFromNow || old && old.stage !== 'offer'
        setup.stage = !consent ? 'offer' : !setup.name ? 'name' : setup.needsType ? 'type' : setup.initialBalance === undefined ? 'balance' : 'confirm'
        if (!setup.currency) throw new ConflictException('Falta la moneda de la cuenta.')
        const question = accountQuestion(setup)
        await this.drafts.save({ profileId: ctx.profileId, sourceInboundId: draft.sourceInboundId, sourceWamid: draft.sourceWamid, field: 'account', question, proposal, meta: { ...meta, accountCreation: setup } })
        return { data: { pendingField: 'account', accountSetup: setup }, reply: question }
      }
    }
    const result = await this.expenses.continue(ctx, proposal, profile, { ...draft, meta })
    return { data: result.result, reply: result.reply }
  }
}
