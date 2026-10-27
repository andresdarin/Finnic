import { formatMoney as decimal, parseMoney } from '@lovehold/shared'
import type { FinanceActivityService } from '../../../finance/application/finance-activity.service'
import { METRIC_DEFINITIONS, type FinanceMetricsService } from '../../../finance/application/finance-metrics.service'
import { normalizeText } from '../parsing/signals'
import { queryPeriod } from '../parsing/query-period'
import { formatMoney } from '../reply/format'
import { isLargestExpenseQuestion } from './largest-expense'
import type { InboundContext } from '../types'

type Kind = 'monthly' | 'product' | 'largest_expense' | 'household_scope' | 'net_definition' | 'rate_definition' | 'rate' | 'net' | 'emergency' | 'budget' | 'goals_definition' | 'capacity_definition' | 'credit'
/** Specific financial reads and definitions; general advice remains a conversation. */
export function financialQuestionKind(raw: string): Kind | null {
  const text = normalizeText(raw)
  if (/\b(hipotetico|ejemplo)\b/.test(text)) return null
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
  if (kind === 'household_scope') return 'Desde este chat puedo consultar tus gastos personales, pero no calcular todavía el total combinado con el hogar sin duplicados. Podés revisar ambos en Movimientos; sumarlos directamente puede contar dos veces una misma compra.'
  if (kind === 'net_definition') return 'El ahorro neto es lo que ingresó menos tus gastos del mes. El saldo es la plata registrada en tus cuentas: son cosas distintas.'
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
  if (!metrics) return 'La app tiene esas métricas, pero no pude consultar tu plan en este momento.'
  let plan = await metrics.plan(ctx.profileId)
  const period = queryPeriod(ctx.text, plan.month)
  if (period.unsupported) return 'Qué mes querés revisar para consultar tu plan?'
  if (period.month !== plan.month) plan = await metrics.plan(ctx.profileId, period.month)
  if (plan.status === 'not_configured') return 'Finnic puede calcular esas métricas, pero todavía no configuraste tu plan. Entrá a Balance → Tranquilidad Financiera para cargar los datos.'
  if (kind === 'emergency') {
    const emergency = plan.goals?.emergency
    return emergency?.monthsCovered != null ? `Tu fondo registrado cubre ${emergency.monthsCovered.toLocaleString('es-UY', { maximumFractionDigits: 1 })} meses de gastos esenciales.` : 'No pude calcular la cobertura del fondo. Revisá los gastos esenciales y las advertencias de tu plan en Balance.'
  }
  if (!plan.totals) return `No pude calcular los totales de ese mes: ${plan.warnings.find(w => /MISSING|INVALID/.test(w.code))?.message ?? 'falta el presupuesto o información del plan'}. Revisalo en Balance.`
  if (kind === 'rate') return plan.totals.savingsRatePct === null ? 'Ese mes no hay ingresos efectivos registrados: la tasa de ahorro no está definida.' : `Tu tasa de ahorro registrada es ${plan.totals.savingsRatePct.toLocaleString('es-UY')}% en ${plan.month}.`
  if (kind === 'net') return `Tu ahorro neto registrado en ${plan.month}: ${formatMoney(plan.totals.netSavings, plan.currency)}. ${METRIC_DEFINITIONS.netSavings}`
  return ['Tu presupuesto registrado:', ...(['needs', 'wants', 'future'] as const).map((key, index) => `${['Necesidades', 'Gustos', 'Futuro'][index]}: ${formatMoney(plan.totals![key].executed, plan.currency)} de ${formatMoney(plan.totals![key].target, plan.currency)}.`), ...(Number(plan.totals.uncategorizedExpenses) > 0 ? [`Además, ${formatMoney(plan.totals.uncategorizedExpenses, plan.currency)} siguen sin clasificación presupuestaria.`] : [])].join('\n')
}
