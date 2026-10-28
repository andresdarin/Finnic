import { Injectable, Optional } from '@nestjs/common'
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
import { queryPeriod, monthLabel } from '../parsing/query-period'
import { comparisonReply, productReply } from './monthly-replies'
import { FinanceMetricsService } from '../../../finance/application/finance-metrics.service'
import { financialQuestionKind, metricAnswer } from './metric-answers'
import { PublicExchangeService } from '../../../finance/fx/public-exchange.service'
import { isExchangeQuoteQuestion, exchangeQuoteAnswer } from './exchange-answer'

/** Read-only answers built from the same use cases as the app. Currencies are never summed together. */
@Injectable()
export class QueryIntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: FinanceActivityService,
    private readonly outlook: SpendingOutlookUseCase,
    private readonly tranquility: TranquilityReadService,
    @Optional() private readonly metrics?: FinanceMetricsService,
    @Optional() private readonly exchange?: PublicExchangeService,
  ) {}

  async monthSpending(ctx: InboundContext): Promise<HandlerResult> {
    const current = await this.activity.monthly(ctx.profileId, ctx.localDate.slice(0, 7))
    const preference = await this.activity.defaultQueryPeriod(ctx.profileId)
    const period = queryPeriod(ctx.text, current.monthKey, preference, ctx.localDate)
    if (period.unsupported) return { reply: '¿Qué período querés consultar? Podés pedirme un mes, una semana, una quincena, un año o todo el historial.', intent: 'other' }
    const requested = currencySignal(ctx.text)
    const currency = requested === 'UYU' || requested === 'USD' ? requested : null
    if (period.comparison) {
      const [first, second] = await Promise.all(period.ranges.map(range => this.activity.range(ctx.profileId, range.from, range.to, range.label)))
      return { reply: comparisonReply(first!, second!, currency), intent: 'query_month_spending' }
    }
    const data = await this.activity.range(ctx.profileId, period.from, period.to, period.label)
    const month = data.monthKey
    const label = data.periodLabel ?? monthLabel(month)
    const totals = Object.entries(data.totalsByCurrency).filter(([value, types]) => (!currency || value === currency) && types.EXPENSE && types.EXPENSE !== '0.00')
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
    const current = await this.activity.monthly(ctx.profileId, ctx.localDate.slice(0, 7))
    const preference = await this.activity.defaultQueryPeriod(ctx.profileId)
    const period = queryPeriod(ctx.text, current.monthKey, preference, ctx.localDate)
    if (period.unsupported) return { reply: '¿Qué período querés revisar para buscar el gasto más alto?', intent: 'other' }
    const data = await this.activity.range(ctx.profileId, period.from, period.to, period.label)
    const signal = currencySignal(ctx.text)
    const requestedCurrency = signal === 'UYU' || signal === 'USD' ? signal : null
    const expenses = data.largestExpensesByCurrency.filter(row => !requestedCurrency || row.currency === requestedCurrency)
    const periodLabel = data.periodLabel ?? monthLabel(data.monthKey)
    if (!expenses.length) return { reply: `No tengo gastos personales registrados en ${periodLabel}` + (requestedCurrency ? ` en ${requestedCurrency}.` : '.'), intent: 'other' }
    const lines = expenses.map(row => `Tu gasto más alto${expenses.length > 1 ? ` en ${row.currency}` : ''} de ${periodLabel} fue ${row.title}: ${formatMoney(row.amount, row.currency)}${row.merchant && normalizeText(row.merchant) !== normalizeText(row.title) ? ` en ${row.merchant}` : ''}, el ${new Intl.DateTimeFormat('es-UY', { timeZone: data.timeZone, day: 'numeric', month: 'numeric' }).format(row.date)}.`)
    if (lines.length > 1) lines.push('Las monedas van por separado.')
    return { reply: lines.join('\n'), intent: 'other', result: { monthKey: data.monthKey, periodLabel, source: 'largest_expenses_full_period' } }
  }

  async financialQuestion(ctx: InboundContext): Promise<HandlerResult | null> {
    if (this.exchange && isExchangeQuoteQuestion(ctx.text)) return { reply: await exchangeQuoteAnswer(this.exchange, ctx.text), intent: 'other' }
    const kind = financialQuestionKind(ctx.text)
    if (!kind) return null
    if (kind === 'monthly') return this.monthSpending(ctx)
    if (kind === 'largest_expense') return this.largestExpense(ctx)
    if (kind === 'product') {
      const current = await this.activity.monthly(ctx.profileId, ctx.localDate.slice(0, 7))
      const preference = await this.activity.defaultQueryPeriod(ctx.profileId)
      const period = queryPeriod(ctx.text, current.monthKey, preference, ctx.localDate)
      if (period.unsupported) return { reply: '¿Qué período querés revisar para comparar los productos?', intent: 'other' }
      const data = await this.activity.range(ctx.profileId, period.from, period.to, period.label)
      const currency = currencySignal(ctx.text)
      return { reply: productReply(data, currency === 'CONFLICT' ? null : currency), intent: 'other' }
    }
    return { reply: await metricAnswer(kind, ctx, this.activity, this.metrics), intent: 'other' }
  }

  async capacity(ctx: InboundContext, ai: TextExtraction | null): Promise<HandlerResult> {
    const window = ai?.window ?? (/fin de semana|finde/i.test(ctx.text) ? 'weekend' : /\bmes\b/i.test(ctx.text) ? 'restOfMonth' : 'today')
    const outlook = await this.outlook.execute(ctx.profileId, window)
    return { reply: capacityReply(outlook, false, /desglose|detalle|c[oó]mo (?:lo )?calcul/i.test(ctx.text)), intent: 'query_spending_capacity', result: { window } }
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
    else verdict = `No te lo recomiendo: ${price} supera tu margen libre registrado (${formatMoney(outlook.protectedCapacity, currency)}).`
    return { reply: !outlook.hasAccounts ? verdict : [verdict, capacityReply(outlook, true)].filter(Boolean).join('\n'), intent: 'query_can_afford', result: { amount, currency } }
  }

  async savings(ctx: InboundContext): Promise<HandlerResult> {
    const profile = await this.prisma.profile.findUnique({ where: { id: ctx.profileId }, select: { authUserId: true } })
    if (!profile) return { reply: 'No encontré tu perfil.', intent: 'query_savings' }
    const dashboard = await this.tranquility.dashboard({ authUserId: profile.authUserId }, ctx.localDate.slice(0, 7))
    const goals = await this.prisma.tranquilityGoal.findMany({ where: { profileId: ctx.profileId, status: 'ACTIVE' }, orderBy: { targetDate: 'asc' }, take: 3 })
    return { reply: savingsReply(dashboard, goals, ctx.localDate), intent: 'query_savings' }
  }
}
