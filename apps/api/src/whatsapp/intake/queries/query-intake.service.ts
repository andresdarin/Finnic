import { Injectable } from '@nestjs/common'
import { parseMoney } from '@lovehold/shared'
import { FinanceActivityService } from '../../../finance/application/finance-activity.service'
import { SpendingOutlookUseCase } from '../../../finance/application/spending-outlook.usecase'
import { TranquilityReadService } from '../../../finance/tranquility/tranquility-read.service'
import { PrismaService } from '../../../prisma/prisma.service'
import { EXPENSE_CATEGORIES, type ExpenseCategoryKey } from '../constants'
import type { TextExtraction } from '../ai/extraction.schemas'
import { aiAmountToCents, centsToMoney, moneyCandidates } from '../parsing/money-text'
import { currencySignal, normalizeText } from '../parsing/signals'
import type { HandlerResult, InboundContext } from '../types'
import { formatMoney } from '../reply/format'
import { capacityReply, savingsReply } from './query-replies'

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre']

/** Read-only answers built from the same use cases as the app. Currencies are never summed together. */
@Injectable()
export class QueryIntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: FinanceActivityService,
    private readonly outlook: SpendingOutlookUseCase,
    private readonly tranquility: TranquilityReadService,
  ) {}

  async monthSpending(ctx: InboundContext): Promise<HandlerResult> {
    const data = await this.activity.monthly(ctx.profileId)
    const month = data.monthKey
    const label = `${MONTHS[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`
    const totals = Object.entries(data.totalsByCurrency).filter(([, types]) => types.EXPENSE && types.EXPENSE !== '0.00')
    if (!totals.length) return { reply: `No tengo gastos personales registrados en ${label}.`, intent: 'query_month_spending' }
    const lines = [`Gastos personales de ${label}:`]
    for (const [currency, types] of totals) {
      lines.push(`• ${formatMoney(types.EXPENSE!, currency)}`)
      const top = data.categories.filter(row => row.currency === currency).sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 3)
      if (top.length) lines.push(`  Principales: ${top.map(row => `${EXPENSE_CATEGORIES[row.category as ExpenseCategoryKey] ?? row.category} ${formatMoney(Number(row.amount).toFixed(2), currency)}`).join(', ')}`)
    }
    if (totals.length > 1) lines.push('Son monedas distintas: no las sumo sin una cotización explícita.')
    lines.push('No incluye gastos compartidos del hogar ni transferencias.')
    return { reply: lines.join('\n'), intent: 'query_month_spending' }
  }

  async largestExpense(ctx: InboundContext): Promise<HandlerResult> {
    const data = await this.activity.monthly(ctx.profileId)
    const signal = currencySignal(ctx.text)
    const requestedCurrency = signal === 'UYU' || signal === 'USD' ? signal : null
    const expenses = data.largestExpensesByCurrency.filter(row => !requestedCurrency || row.currency === requestedCurrency)
    if (!expenses.length) return { reply: 'No tengo gastos personales registrados este mes' + (requestedCurrency ? ` en ${requestedCurrency}.` : '.'), intent: 'other' }
    const lines = expenses.map(row => `Tu gasto más alto${expenses.length > 1 ? ` en ${row.currency}` : ''} fue ${row.title}: ${formatMoney(row.amount, row.currency)}${row.merchant && normalizeText(row.merchant) !== normalizeText(row.title) ? ` en ${row.merchant}` : ''}, el ${new Intl.DateTimeFormat('es-UY', { timeZone: data.timeZone, day: 'numeric', month: 'numeric' }).format(row.date)}.`)
    if (lines.length > 1) lines.push('Las monedas van por separado.')
    return { reply: lines.join('\n'), intent: 'other', result: { monthKey: data.monthKey, source: 'largest_expenses_full_month' } }
  }

  async capacity(ctx: InboundContext, ai: TextExtraction | null): Promise<HandlerResult> {
    const window = ai?.window ?? (/fin de semana|finde/i.test(ctx.text) ? 'weekend' : /\bmes\b/i.test(ctx.text) ? 'restOfMonth' : 'today')
    const outlook = await this.outlook.execute(ctx.profileId, window)
    return { reply: capacityReply(outlook), intent: 'query_spending_capacity', result: { window } }
  }

  async canAfford(ctx: InboundContext, ai: TextExtraction | null): Promise<HandlerResult> {
    const candidates = moneyCandidates(ctx.text)
    const aiCents = aiAmountToCents(ai?.amount)
    const cents = aiCents !== null && candidates.includes(aiCents) ? aiCents : candidates.length === 1 ? candidates[0]! : null
    if (cents === null) return { reply: '¿De cuánto sería la compra? Por ejemplo: "¿puedo comprar algo de 3.000 pesos?"', intent: 'query_can_afford' }
    const outlook = await this.outlook.execute(ctx.profileId, 'today')
    const signal = currencySignal(ctx.text)
    const currency = signal === 'USD' || signal === 'UYU' ? signal : outlook.currency
    if (currency !== outlook.currency) return { reply: `Calculo tu margen en ${outlook.currency} y no tengo una cotización explícita para convertir ${currency}. Preguntame el importe en ${outlook.currency}.`, intent: 'query_can_afford' }
    const amount = centsToMoney(cents)
    const value = cents, recommended = parseMoney(outlook.recommendedSpend), protectedCapacity = parseMoney(outlook.protectedCapacity)
    const price = formatMoney(amount, currency)
    let verdict: string
    if (!outlook.hasAccounts) verdict = `No puedo responderlo: no tengo saldos cargados. Registrá tus cuentas en Balance.`
    else if (value <= recommended) verdict = `Sí: ${price} entra en lo recomendado para hoy (${formatMoney(outlook.recommendedSpend, currency)}) sin tocar obligaciones ni ahorro reservado.`
    else if (value <= protectedCapacity) verdict = `Podés, pero con cuidado: ${price} supera lo recomendado para hoy (${formatMoney(outlook.recommendedSpend, currency)}) y achica el margen del resto del mes. Después te quedarían ${formatMoney(centsToMoney(protectedCapacity - value), currency)} libres hasta fin de mes.`
    else verdict = `No te lo recomiendo: ${price} supera tu margen libre (${formatMoney(outlook.protectedCapacity, currency)}) y comprometería obligaciones pendientes o el ahorro reservado.`
    return { reply: `${verdict}\n${capacityReply(outlook, true)}`, intent: 'query_can_afford', result: { amount, currency } }
  }

  async savings(ctx: InboundContext): Promise<HandlerResult> {
    const profile = await this.prisma.profile.findUnique({ where: { id: ctx.profileId }, select: { authUserId: true } })
    if (!profile) return { reply: 'No encontré tu perfil.', intent: 'query_savings' }
    const dashboard = await this.tranquility.dashboard({ authUserId: profile.authUserId }, ctx.localDate.slice(0, 7))
    const goals = await this.prisma.tranquilityGoal.findMany({ where: { profileId: ctx.profileId, status: 'ACTIVE' }, orderBy: { targetDate: 'asc' }, take: 3 })
    return { reply: savingsReply(dashboard, goals, ctx.localDate), intent: 'query_savings' }
  }
}
