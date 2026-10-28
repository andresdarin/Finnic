import { DraftRecoveryService } from './draft-recovery.service'
import { isDeepStrictEqual } from 'node:util'
import { DraftConfirmationService } from './draft-confirmation.service'
import { ConflictException, Injectable, Optional } from '@nestjs/common'
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
  constructor(private readonly drafts: DraftRepository, private readonly context: IntakeContextService, private readonly expenses: ExpenseIntakeService, @Optional() private readonly confirmations?: DraftConfirmationService, @Optional() private readonly recovery?: DraftRecoveryService) {}

  statusForRequest(ctx: InboundContext): Partial<ScopedDraftTools> {
    const resume: Partial<ScopedDraftTools> = this.recovery ? { resume_pending_expense: { declaration: { name: 'resume_pending_expense', description: 'Retoma un borrador apartado, vencido o cancelado del mismo usuario SOLO si pide retomarlo. Usar draftId de get_intake_status. No registra el gasto: vuelve a mostrar lo pendiente y exige nueva confirmación. No usar solo porque pregunta si se registró.', parameters: { type: 'object', properties: { draftId: { type: 'string' } }, required: ['draftId'] } }, schema: z.object({ draftId: z.string().min(1) }).strict(), execute: async args => this.recovery!.resume(ctx, String(args.draftId)) } } : {}
    return { ...resume, get_intake_status: { declaration: { name: 'get_intake_status', description: 'Consulta estados reales de los últimos gastos recibidos: pendientes, apartados, completados, cancelados o vencidos. Solo completed con ledgerVerified y expenseId demuestra registro. No incluye registros directos sin borrador; para esos casos consultar actividad. Nunca confundir una propuesta conversada con un gasto guardado.', parameters: { type: 'object', properties: {} } }, schema: z.object({}).strict(), execute: async () => ({ data: await this.drafts.recentStatus(ctx.profileId) }) } }
  }

  forRequest(ctx: InboundContext, expected: StoredDraft): ScopedDraftTools {
    const current = async () => {
      const draft = await this.drafts.findOpen(ctx.profileId)
      if (!draft || draft.id !== expected.id) throw new ConflictException('El borrador cambió o venció. Consultá el estado actual.')
      return draft
    }
    const extra: Partial<ScopedDraftTools> = {
      ...this.statusForRequest(ctx),
      cancel_pending_operation: { declaration: { name: 'cancel_pending_operation', description: 'Cancela el borrador de gasto o solo el alta de cuenta si el usuario lo pide. Nunca borra movimientos ya guardados.', parameters: { type: 'object', properties: { scope: { type: 'string', enum: ['account', 'expense'] } }, required: ['scope'] } }, schema: z.object({ scope: z.enum(['account', 'expense']) }).strict(), execute: async args => {
        const draft = await current()
        if (args.scope === 'expense') { await this.drafts.close(draft.id, ctx.profileId, 'cancelled'); return { reply: 'Cancelé este gasto pendiente. No borré movimientos registrados.' } }
        const meta = { ...draft.meta }; delete meta.accountCreation
        const question = 'El alta de cuenta quedó cancelada. Seguimos con una cuenta existente o dejamos el gasto sin cuenta?'
        await this.drafts.save({ profileId: ctx.profileId, sourceInboundId: draft.sourceInboundId, sourceWamid: draft.sourceWamid, proposal: draft.proposal, field: 'account', question, meta })
        return { reply: question }
      } },
    }
    if (this.confirmations && !ctx.fromAudio && (expected.meta.accountCreation?.stage === 'confirm' || ['receipt_confirmation', 'duplicate'].includes(expected.pendingField))) {
      extra.confirm_pending_operation = { declaration: { name: 'confirm_pending_operation', description: 'Confirma SOLO la propuesta mostrada al inicio de este turno cuando el mensaje actual del usuario la acepta claramente, incluso con expresiones naturales y corteses. No usar si pregunta, duda, rechaza o cambia datos. No usar para preparar/modificar. La confirmación de una cuenta nunca confirma también el gasto.', parameters: { type: 'object', properties: {} } }, schema: z.object({}).strict(), execute: async () => this.confirmations!.confirm(ctx, expected) }
    }
    return {
      ...extra,
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
        if (isDeepStrictEqual(setup, old) && isDeepStrictEqual(proposal, draft.proposal)) return { data: { unchanged: true, message: 'La propuesta no cambió. Si el usuario está aceptando, invocá confirm_pending_operation; no vuelvas a prepararla. Si pide estado, consultá get_intake_status.', pendingField: draft.pendingField, accountSetup: old } }
        await this.drafts.save({ profileId: ctx.profileId, sourceInboundId: draft.sourceInboundId, sourceWamid: draft.sourceWamid, field: 'account', question, proposal, meta: { ...meta, accountCreation: setup } })
        return { data: { pendingField: 'account', accountSetup: setup }, reply: question }
      }
    }
    if (isDeepStrictEqual(proposal, draft.proposal) && isDeepStrictEqual(meta, draft.meta)) return { data: { unchanged: true, message: 'No cambió el borrador. Si el usuario acepta la propuesta, usá confirm_pending_operation. No repitas la propuesta como si fuera una actualización.', pendingField: draft.pendingField } }
    const result = await this.expenses.continue(ctx, proposal, profile, { ...draft, meta })
    return { data: result.result, reply: result.reply }
  }
}
