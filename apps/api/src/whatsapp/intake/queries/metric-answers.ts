import { formatMoney as decimal, parseMoney } from '@lovehold/shared'
import type { FinanceActivityService } from '../../../finance/application/finance-activity.service'
import type { FinanceMetricsService } from '../../../finance/application/finance-metrics.service'
import { normalizeText } from '../parsing/signals'
import { queryPeriod } from '../parsing/query-period'
import { formatMoney } from '../reply/format'
import { isLargestExpenseQuestion } from './largest-expense'
import type { InboundContext } from '../types'

type Kind = 'currency_definition' | 'monthly' | 'product' | 'largest_expense' | 'household_scope' | 'card_payment_definition' | 'bank_sync' | 'net_definition' | 'rate_definition' | 'rate' | 'net' | 'emergency' | 'budget' | 'goals_definition' | 'capacity_definition' | 'credit'
/** Specific financial reads and definitions; general advice remains a conversation. */
export function financialQuestionKind(raw: string): Kind | null {
  const text = normalizeText(raw)
  if (/\b(hipotetico|ejemplo)\b/.test(text)) return null
  if (/pesos|dolares|uyu|usd/.test(text) && /como.*(?:sum|convert)|que cotizacion.*usas|que cotizacion.*usando/.test(text)) return 'currency_definition'
  if (/tarjeta/.test(text) && /pago|pagar/.test(text) && /dos veces|doble|duplic/.test(text)) return 'card_payment_definition'
  if (/bancar|banco/.test(text) && /tiempo real|conectad|conexion|solo lo que|sincroniz/.test(text)) return 'bank_sync'
  if (/hogar|compartidos/.test(text) && /personales/.test(text) && /gaste|total|sum|contar|duplic/.test(text)) return 'household_scope'
  if (/tasa de ahorro/.test(text)) {
    if (/significa|calcul|que es|sin ingresos|no (?:tengo|hay) ingresos|ingresos (?:son )?cero/.test(text)) return 'rate_definition'
    return 'rate'
  }
  if (/ahorro neto/.test(text)) return /significa|calcul|que es|lo mismo|diferencia/.test(text) ? 'net_definition' : 'net'
  if (/\bguardar\b/.test(text) && /\b(llegar|multiplicar|libertad)\b/.test(text)) return 'goals_definition'
  if (/cuantos meses.*fondo|fondo.*(?:cubre|cobertura)|cobertura.*emergencia/.test(text)) return 'emergency'
  if (/presupuesto/.test(text) && /necesidades|gustos|futuro/.test(text)) return 'budget'
  if (/saldo/.test(text) && /distinto|diferencia|por que/.test(text) && /gastar|capacidad|margen/.test(text)) return 'capacity_definition'
  if (/deuda/.test(text) && /tarjeta/.test(text) && /\b(mi|mis|tengo|registrada|registrado)\b/.test(text)) return 'credit'
  if (/gaste|gastos|gastamos/.test(text) && /compar|mas o menos|mas que|menos que/.test(text)) return 'monthly'
  if (/^(?:anota|registra|gaste|pague)\b/.test(text)) return null
  if (isLargestExpenseQuestion(raw)) return 'largest_expense'
  if (/mas caro|mayor gasto|gasto mas (?:alto|grande)/.test(text) && /compre|compra|gasto|producto|articulo/.test(text)) return /producto|articulo/.test(text) ? 'product' : 'largest_expense'
  return null
}

export async function metricAnswer(kind: Exclude<Kind, 'monthly' | 'product' | 'largest_expense'>, ctx: InboundContext, activity: FinanceActivityService, metrics?: FinanceMetricsService) {
  if (kind === 'currency_definition') return 'Los saldos van por moneda. Para el presupuesto, uso la cotización que quedó guardada en cada movimiento convertido; si falta, el total queda incompleto. No hay una única cotización actual para todo el plan: la referencia de Prex es aparte y no cambia tus gastos anteriores.'
  if (kind === 'card_payment_definition') return 'No: la compra es el gasto y el pago de la tarjeta cancela la deuda. Son cosas distintas, no dos gastos.'
  if (kind === 'bank_sync') return 'Solo veo lo que registrás en Finnic. No tengo conexión a tus bancos ni veo sus movimientos en tiempo real.'
  if (kind === 'household_scope') return 'Desde este chat puedo consultar tus gastos personales, pero no calcular todavía el total combinado con el hogar sin duplicados. Podés revisar ambos en Movimientos; sumarlos directamente puede contar dos veces una misma compra.'
  if (kind === 'net_definition') {
    const current = await activity.monthly(ctx.profileId, ctx.localDate.slice(0, 7))
    const preference = await activity.defaultQueryPeriod(ctx.profileId)
    const period = queryPeriod(ctx.text, current.monthKey, preference, ctx.localDate)
    return `El ahorro neto es lo que ingresó menos tus gastos en ${period.label}. El saldo es la plata registrada en tus cuentas: son cosas distintas.`
  }
  if (kind === 'rate_definition') return 'La tasa de ahorro es (ingresos − gastos) ÷ ingresos × 100. Con ingresos cero no está definida: podés medir cuánto ahorraste o usaste de tus ahorros, pero no ese porcentaje.'
  if (kind === 'capacity_definition') return 'El saldo es lo registrado en tus cuentas. El margen para gastar también considera deuda, pagos pendientes, ahorro reservado y colchón mínimo; deja afuera fondos no gastables.'
  if (kind === 'goals_definition') return 'GUARDAR: lo que planificás apartar cada mes.\nLLEGAR: una meta concreta, con importe y fecha.\nMULTIPLICAR: el capital objetivo según tu multiplicador.\nLibertad financiera: una proyección para cubrir gastos con inversiones; no es una garantía.'
  if (kind === 'credit') {
    const { accounts } = await activity.accounts(ctx.profileId)
    const cards = accounts.filter(account => account.type === 'CREDIT')
    if (!cards.length) return 'Finnic sí registra deuda de tarjetas, pero no tenés ninguna tarjeta activa cargada. Podés agregarla en Balance.'
    const totals = new Map<string, bigint>()
    for (const card of cards) totals.set(card.currency, (totals.get(card.currency) ?? 0n) + (parseMoney(Number(card.balance).toFixed(2)) > 0n ? parseMoney(Number(card.balance).toFixed(2)) : 0n))
    return `Tu deuda registrada en tarjetas: ${[...totals].map(([currency, amount]) => formatMoney(decimal(amount), currency)).join('; ')}. Son saldos de Finnic, sin conexión bancaria.`
  }
  const preference = await activity.defaultQueryPeriod(ctx.profileId)
  const currentMonth = ctx.localDate.slice(0, 7)
  const period = queryPeriod(ctx.text, currentMonth, preference, ctx.localDate)
  if (period.unsupported) return '¿Qué período querés revisar para consultar tus números?'
  if (kind === 'net' || kind === 'rate') {
    const data = await activity.range(ctx.profileId, period.from, period.to, period.label)
    const values = Object.entries(data.totalsByCurrency).map(([currency, totals]) => {
      const income = parseMoney(totals.INCOME ?? '0.00')
      const expenses = parseMoney(totals.EXPENSE ?? '0.00')
      const net = income - expenses
      return kind === 'net'
        ? formatMoney(decimal(net), currency)
        : income === 0n ? `${currency}: sin ingresos registrados` : `${currency}: ${Number(net * 10000n / income) / 100}%`
    })
    if (!values.length) return `No tengo movimientos personales registrados en ${period.label}.`
    if (kind === 'rate' && values.every(value => value.includes('sin ingresos'))) return `En ${period.label} no hay ingresos registrados; la tasa de ahorro no está definida.`
    return kind === 'net' ? `Tu ahorro neto de ${period.label}: ${values.join('; ')}.` : `Tu tasa de ahorro de ${period.label}: ${values.join('; ')}.`
  }
  if (!metrics) return 'La app tiene esas métricas, pero no pude consultar tu plan en este momento.'
  let plan = await metrics.plan(ctx.profileId)
  if (period.period === 'MONTH' && period.month !== plan.month) plan = await metrics.plan(ctx.profileId, period.month)
  if (kind === 'budget' && period.period !== 'MONTH') return `El presupuesto de Finnic se define por mes. Para ${plan.month}, revisá tus objetivos mensuales en Balance → Tranquilidad Financiera.`
  if (plan.status === 'not_configured') return 'Finnic puede calcular esas métricas, pero todavía no configuraste tu plan. Entrá a Balance → Tranquilidad Financiera para cargar los datos.'
  if (kind === 'emergency') {
    const emergency = plan.goals?.emergency
    return emergency?.monthsCovered != null ? `Tu fondo registrado cubre ${emergency.monthsCovered.toLocaleString('es-UY', { maximumFractionDigits: 1 })} meses de gastos esenciales.` : 'No pude calcular la cobertura del fondo. Revisá los gastos esenciales y las advertencias de tu plan en Balance.'
  }
  if (!plan.totals) return `No pude calcular los totales de ese mes: ${plan.warnings.find(w => /MISSING|INVALID/.test(w.code))?.message ?? 'falta el presupuesto o información del plan'}. Revisalo en Balance.`
  return [`Tu presupuesto mensual de ${plan.month}:`, ...(['needs', 'wants', 'future'] as const).map((key, index) => `${['Necesidades', 'Gustos', 'Futuro'][index]}: ${formatMoney(plan.totals![key].executed, plan.currency)} de ${formatMoney(plan.totals![key].target, plan.currency)}.`), ...(Number(plan.totals.uncategorizedExpenses) > 0 ? [`Además, ${formatMoney(plan.totals.uncategorizedExpenses, plan.currency)} siguen sin clasificación presupuestaria.`] : [])].join('\n')
}
