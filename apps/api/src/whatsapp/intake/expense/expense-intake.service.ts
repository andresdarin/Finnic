import { Injectable, Optional } from '@nestjs/common'
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
import { DocumentIncomeService } from './document-income.service'

const FIXED: ExpenseCategoryKey[] = ['alquiler', 'gastos_comunes', 'ute', 'ose', 'antel', 'internet']

@Injectable()
export class ExpenseIntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createExpense: CreateExpenseUseCase,
    private readonly drafts: DraftRepository,
    @Optional() private readonly incomes?: DocumentIncomeService,
  ) {}

  /** Asks exactly one question, or registers the expense. The origin wamid is the idempotency key. */
  async continue(ctx: InboundContext, input: Parameters<typeof nextStep>[0], profile: IntakeProfileContext, draft?: StoredDraft, notes: string[] = []): Promise<HandlerResult> {
    if (ctx.fromAudio) input = { ...input, audioConfirmationRequired: true }
    const origin = draft ? { inboundId: draft.sourceInboundId, wamid: draft.sourceWamid } : { inboundId: ctx.inboundId, wamid: ctx.wamid }
    const source = origin.wamid.startsWith('app:') ? 'web' : 'whatsapp'
    if (input.transferDocument && !input.movementType) {
      const question = 'Esta transferencia la recibiste o la enviaste? Decime ingreso, egreso o entre mis cuentas. No guardé nada.'
      const saved = await this.drafts.save({ profileId: ctx.profileId, sourceInboundId: origin.inboundId, sourceWamid: origin.wamid, field: 'movement_direction', question, proposal: input })
      return { reply: question, intent: 'clarification', result: { draftId: saved.id } }
    }
    if (input.transferDocument && input.movementType === 'INCOME') input = { ...input, paymentMethod: 'TRANSFER' }
    const step = nextStep(input, input.transferDocument ? { ...profile, defaultCurrency: null } : profile)
    if (step.kind === 'ask') {
      if (!draft && input.inputMethod === 'RECEIPT_SCAN' && !input.transferDocument) {
        const amount = input.amount && input.currency ? ` por ${formatMoney(input.amount, input.currency)}` : ''
        notes = [`Leí el ticket de ${input.merchant ?? input.title}${amount}${input.items?.length ? `, con ${input.items.length} ${input.items.length === 1 ? 'producto' : 'productos'}` : ''}. Todavía no lo guardé.`, ...notes]
      }
      const accountCreation = step.field === 'account' && (step.proposal.accountHint || step.proposal.paymentMethod === 'CREDIT') && !step.options?.length && step.proposal.currency
        ? { type: step.proposal.paymentMethod === 'CREDIT' ? 'CREDIT' as const : step.proposal.paymentMethod === 'CASH' ? 'CASH' as const : 'BANK' as const, name: step.proposal.accountHint ?? undefined, needsType: !step.proposal.paymentMethod || step.proposal.paymentMethod === 'CARD', currency: step.proposal.currency, stage: 'offer' as const } : undefined
      const saved = await this.drafts.save({ profileId: ctx.profileId, sourceInboundId: origin.inboundId, sourceWamid: origin.wamid, field: step.field, question: step.question, proposal: step.proposal, meta: { ...(draft?.meta ?? {}), options: step.options, accountCreation } })
      return { reply: [...notes, step.question].join('\n'), intent: 'clarification', result: { draftId: saved.id, pendingField: step.field } }
    }

    const proposal = step.proposal
    if (proposal.inputMethod === 'RECEIPT_SCAN' && !proposal.duplicateAcknowledged) {
      const duplicate = await findReceiptDuplicate(this.prisma, ctx.profileId, proposal, origin.wamid)
      if (duplicate) {
        const question = `Este ${proposal.transferDocument ? 'comprobante' : 'ticket'} parece igual a uno que ya registré el ${formatDate(duplicate.date)} por ${formatMoney(duplicate.amount, duplicate.currency)}${duplicate.reason === 'same_image' ? ' (mismo archivo)' : ''}. ¿Lo registro igual? (sí / no)`
        const saved = await this.drafts.save({ profileId: ctx.profileId, sourceInboundId: origin.inboundId, sourceWamid: origin.wamid, field: 'duplicate', question, proposal, meta: draft?.meta })
        return { reply: question, intent: 'clarification', result: { draftId: saved.id, pendingField: 'duplicate', duplicateOf: duplicate.id } }
      }
    }

    const reconciled = receiptItems(proposal)
    if (proposal.inputMethod === 'RECEIPT_SCAN' && proposal.receiptItemsEdited && !reconciled.matches) {
      const question = `El detalle corregido no coincide con el total del ticket (${formatMoney(proposal.amount, proposal.currency)}). Revisá el total o el descuento: podés decir "El total es…" o "El descuento es…". No guardé nada.`
      const saved = await this.drafts.save({ profileId: ctx.profileId, sourceInboundId: origin.inboundId, sourceWamid: origin.wamid, field: 'receipt_confirmation', question, proposal: { ...proposal, receiptConfirmed: false }, meta: draft?.meta })
      return { reply: question, intent: 'clarification', result: { draftId: saved.id, pendingField: 'receipt_confirmation' } }
    }
    if ((proposal.inputMethod === 'RECEIPT_SCAN' || proposal.confirmationRequired || proposal.audioConfirmationRequired || ctx.fromAudio) && !proposal.receiptConfirmed) {
      const question = [...notes, proposal.transferDocument ? `${proposal.movementType === 'INCOME' ? 'Ingreso' : 'Egreso'} de ${formatMoney(proposal.amount, proposal.currency)}, el ${formatDate(proposal.date)}. ${step.account ? `${proposal.movementType === 'INCOME' ? 'Lo sumo a' : 'Lo descuento de'} ${step.account.name}.` : 'Sin cuenta, sin cambiar saldos.'}\nLo guardo? Decime sí o no.` : proposal.inputMethod === 'RECEIPT_SCAN' ? receiptReview(proposal, step.account?.name ?? null) : `Entendí ${formatMoney(proposal.amount, proposal.currency)} en ${proposal.title}, el ${formatDate(proposal.date)}. ${step.account ? `Lo cargo a ${step.account.name}.` : 'Queda sin cuenta.'}\nLo guardo? Decime sí o no por escrito.`].join('\n')
      const saved = await this.drafts.save({ profileId: ctx.profileId, sourceInboundId: origin.inboundId, sourceWamid: origin.wamid, field: 'receipt_confirmation', question, proposal, meta: draft?.meta })
      return { reply: question, intent: 'clarification', result: { draftId: saved.id, pendingField: 'receipt_confirmation' } }
    }

    const keepItems = reconciled.matches
    const noteParts = [source === 'web' ? 'Registrado por el chat de Finnic' : 'Registrado por WhatsApp', proposal.inputMethod === 'RECEIPT_SCAN' ? 'desde comprobante' : null, proposal.paymentMethod ? `medio: ${PAYMENT_LABELS[proposal.paymentMethod]}` : null, proposal.accountless ? 'sin cuenta asignada' : null].filter(Boolean)
    if (proposal.movementType === 'INCOME' && !this.incomes) throw new Error('Income intake unavailable')
    const created = proposal.movementType === 'INCOME' ? await this.incomes!.create(ctx.profileId, origin.wamid, proposal, source) : await this.createExpense.execute({
      profileId: ctx.profileId,
      input: {
        title: proposal.title, merchant: proposal.merchant ?? undefined, amount: proposal.amount, currency: proposal.currency,
        date: purchaseInstant(proposal.date), category: proposal.category,
        type: proposal.category === 'supermercado' ? 'supermarket' : FIXED.includes(proposal.category as ExpenseCategoryKey) ? 'fixed' : 'variable',
        inputMethod: proposal.inputMethod, notes: noteParts.join(' · '),
        financeAccountId: proposal.financeAccountId ?? undefined, tranquilityCategoryId: proposal.budgetCategoryId ?? undefined,
        items: keepItems ? reconciled.items.map(item => ({ name: item.name, totalPrice: item.totalPrice, quantity: item.quantity ?? undefined, unitPrice: item.unitPrice ?? undefined, category: 'OTROS', rawLine: item.rawLine })) : undefined,
      },
      context: { source, sourceMessageId: origin.wamid, inputMethod: proposal.inputMethod },
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
    const account = row.financeAccount ? row.movementType === 'INCOME' ? `Lo sumé al saldo de ${row.financeAccount.name}.` : row.financeAccount.type === 'CREDIT' ? `Lo sumé a la deuda de ${row.financeAccount.name}.` : `Lo cargué a ${row.financeAccount.name}.` : 'Quedó sin cuenta, sin cambiar tus saldos.'
    const budget = row.tranquilityCategory ? `Presupuesto: ${row.tranquilityCategory.name} (${row.tranquilityCategory.bucket === 'NEEDS' ? 'esenciales' : 'gustos'})` : null
    const lines = [
      `Listo, anoté ${row.movementType === 'INCOME' ? 'un ingreso de ' : ''}${formatMoney(row.amount.toFixed(2), row.currency)} en ${row.title}${row.merchant && row.merchant !== row.title ? ` (${row.merchant})` : ''}.`,
      `${formatDate(localDay(row.date))} · ${category}`,
      account,
      ...(budget ? [budget] : []),
      ...notes,
    ]
    if (profile.planCurrency && row.currency !== profile.planCurrency && !row.tranquilityFxSnapshot) {
      lines.push(`Tu plan está en ${profile.planCurrency}: para que cuente en el presupuesto respondé "cotización 40,25" (${profile.planCurrency === 'UYU' ? 'pesos por dólar' : 'dólares por peso'}). Sin cotización no lo convierto.`)
    }
    return lines.join('\n')
  }
}

const localDay = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
