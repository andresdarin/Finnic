import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import { CreateExpenseUseCase } from '../../../finance/application/create-expense.usecase'
import { EXPENSE_CATEGORIES, type ExpenseCategoryKey } from '../constants'
import { purchaseInstant } from '../parsing/local-date'
import { formatDate, formatMoney, PAYMENT_LABELS } from '../reply/format'
import { receiptReview } from '../reply/receipt-review'
import type { HandlerResult, InboundContext } from '../types'
import { DraftRepository, type StoredDraft } from './draft.repository'
import { findReceiptDuplicate } from './receipt-duplicates'
import type { IntakeProfileContext } from './intake-context.service'
import { nextStep } from './next-step'
import { receiptItems } from './receipt-items'

const FIXED: ExpenseCategoryKey[] = ['alquiler', 'gastos_comunes', 'ute', 'ose', 'antel', 'internet']

@Injectable()
export class ExpenseIntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createExpense: CreateExpenseUseCase,
    private readonly drafts: DraftRepository,
  ) {}

  /** Asks exactly one question, or registers the expense. The origin wamid is the idempotency key. */
  async continue(ctx: InboundContext, input: Parameters<typeof nextStep>[0], profile: IntakeProfileContext, draft?: StoredDraft, notes: string[] = []): Promise<HandlerResult> {
    const origin = draft ? { inboundId: draft.sourceInboundId, wamid: draft.sourceWamid } : { inboundId: ctx.inboundId, wamid: ctx.wamid }
    const step = nextStep(input, profile)
    if (step.kind === 'ask') {
      const saved = await this.drafts.save({ profileId: ctx.profileId, sourceInboundId: origin.inboundId, sourceWamid: origin.wamid, field: step.field, question: step.question, proposal: step.proposal, meta: { ...(draft?.meta ?? {}), options: step.options } })
      return { reply: [...notes, step.question].join('\n'), intent: 'clarification', result: { draftId: saved.id, pendingField: step.field } }
    }

    const proposal = step.proposal
    if (proposal.inputMethod === 'RECEIPT_SCAN' && !proposal.duplicateAcknowledged) {
      const duplicate = await findReceiptDuplicate(this.prisma, ctx.profileId, proposal, origin.wamid)
      if (duplicate) {
        const question = `Este ticket parece igual a uno que ya registré el ${formatDate(duplicate.date)} por ${formatMoney(duplicate.amount, duplicate.currency)}${duplicate.reason === 'same_image' ? ' (misma imagen)' : ''}. ¿Lo registro igual? (sí / no)`
        const saved = await this.drafts.save({ profileId: ctx.profileId, sourceInboundId: origin.inboundId, sourceWamid: origin.wamid, field: 'duplicate', question, proposal, meta: draft?.meta })
        return { reply: question, intent: 'clarification', result: { draftId: saved.id, pendingField: 'duplicate', duplicateOf: duplicate.id } }
      }
    }

    if (proposal.inputMethod === 'RECEIPT_SCAN' && !proposal.receiptConfirmed) {
      const question = [...notes, receiptReview(proposal, step.account?.name ?? null)].join('\n')
      const saved = await this.drafts.save({ profileId: ctx.profileId, sourceInboundId: origin.inboundId, sourceWamid: origin.wamid, field: 'receipt_confirmation', question, proposal, meta: draft?.meta })
      return { reply: question, intent: 'clarification', result: { draftId: saved.id, pendingField: 'receipt_confirmation' } }
    }

    const reconciled = receiptItems(proposal)
    const keepItems = reconciled.matches
    const noteParts = ['Registrado por WhatsApp', proposal.inputMethod === 'RECEIPT_SCAN' ? 'desde foto de ticket' : null, proposal.paymentMethod ? `medio: ${PAYMENT_LABELS[proposal.paymentMethod]}` : null, proposal.accountless ? 'sin cuenta asignada' : null].filter(Boolean)
    const created = await this.createExpense.execute({
      profileId: ctx.profileId,
      input: {
        title: proposal.title, merchant: proposal.merchant ?? undefined, amount: proposal.amount, currency: proposal.currency,
        date: purchaseInstant(proposal.date), category: proposal.category,
        type: proposal.category === 'supermercado' ? 'supermarket' : FIXED.includes(proposal.category as ExpenseCategoryKey) ? 'fixed' : 'variable',
        inputMethod: proposal.inputMethod, notes: noteParts.join(' · '),
        financeAccountId: proposal.financeAccountId ?? undefined, tranquilityCategoryId: proposal.budgetCategoryId ?? undefined,
        items: keepItems ? reconciled.items.map(item => ({ name: item.name, totalPrice: item.totalPrice, quantity: item.quantity ?? undefined, unitPrice: item.unitPrice ?? undefined, category: 'OTROS', rawLine: item.rawLine })) : undefined,
      },
      context: { source: 'whatsapp', sourceMessageId: origin.wamid, inputMethod: proposal.inputMethod },
    })
    await this.prisma.whatsAppExpenseAction.upsert({
      where: { inboundId: ctx.inboundId }, update: {},
      create: { profileId: ctx.profileId, inboundId: ctx.inboundId, expenseId: created.id, kind: 'create', after: { amount: String(created.amount), currency: created.currency, sourceWamid: origin.wamid } },
    })
    if (draft) await this.drafts.close(draft.id, ctx.profileId, 'completed', created.id)
    if (proposal.items?.length && !keepItems) notes.push('No guardé el detalle de productos porque no coincidía con el total del ticket.')
    return { reply: await this.confirmation(created.id, ctx.profileId, profile, notes), intent: 'register_expense', result: { expenseId: created.id } }
  }

  /** Built from the persisted row, so the reply states what was actually saved. */
  async confirmation(expenseId: string, profileId: string, profile: IntakeProfileContext, notes: string[] = []) {
    const row = await this.prisma.personalExpense.findFirst({
      where: { id: expenseId, profileId },
      include: { financeAccount: { select: { name: true, type: true } }, tranquilityCategory: { select: { name: true, bucket: true } } },
    })
    if (!row) return 'Registré el gasto, pero no pude leerlo de vuelta. Revisalo en Finanzas.'
    const category = EXPENSE_CATEGORIES[row.category as ExpenseCategoryKey] ?? row.category
    const account = row.financeAccount ? `Cuenta: ${row.financeAccount.name}${row.financeAccount.type === 'CREDIT' ? ' (suma a la deuda de la tarjeta)' : ''}` : 'Sin cuenta asignada (no mueve saldos)'
    const budget = row.tranquilityCategory ? `Presupuesto: ${row.tranquilityCategory.name} (${row.tranquilityCategory.bucket === 'NEEDS' ? 'esenciales' : 'gustos'})` : null
    const lines = [
      `✅ Registré ${formatMoney(row.amount.toFixed(2), row.currency)} · ${category} · ${formatDate(localDay(row.date))}`,
      `${row.title}${row.merchant && row.merchant !== row.title ? ` (${row.merchant})` : ''}`,
      account,
      ...(budget ? [budget] : []),
      ...notes,
    ]
    if (profile.planCurrency && row.currency !== profile.planCurrency && !row.tranquilityFxSnapshot) {
      lines.push(`Tu plan está en ${profile.planCurrency}: para que cuente en el presupuesto respondé "cotización 40,25" (${profile.planCurrency === 'UYU' ? 'pesos por dólar' : 'dólares por peso'}). Sin cotización no lo convierto.`)
    }
    lines.push('Para corregir: "eran 580", "fue en efectivo" o "deshacé ese gasto".')
    return lines.join('\n')
  }
}

const localDay = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
