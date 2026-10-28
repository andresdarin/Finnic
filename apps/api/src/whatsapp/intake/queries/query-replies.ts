import type { TranquilityDashboard } from '@lovehold/shared'
import type { TranquilityGoal } from '@prisma/client'
import type { SpendingOutlook } from '../../../finance/application/spending-outlook.usecase'
import { requiredMonthlyContribution } from '../../../finance/tranquility/goals/goal-math'
import { formatDate, formatMoney } from '../reply/format'

const WINDOW_LABEL = { today: 'hoy', weekend: 'este fin de semana', restOfMonth: 'el resto del mes' } as const

export function capacityReply(outlook: SpendingOutlook, compact = false, detailed = false) {
  const m = (value: string) => formatMoney(value, outlook.currency)
  if (!outlook.hasAccounts) return 'No tengo saldos cargados, así que no puedo calcular cuánto podés gastar. Registrá tus cuentas en Balance.'
  const lines = compact ? [] : [`Podés gastar ${m(outlook.recommendedSpend)} ${WINDOW_LABEL[outlook.window]}.`]
  if (!detailed) {
    if (Number(outlook.freeBalance) < 0) lines.push(`Tu saldo libre registrado es ${m(outlook.freeBalance)}.`)
    if (Number(outlook.creditDebt) > 0) lines.push(`Ya desconté ${m(outlook.creditDebt)} de deuda de tarjetas.`)
    if (Number(outlook.pendingObligations) > 0) lines.push(`Pagos pendientes: ${m(outlook.pendingObligations)}.`)
    if (Number(outlook.plannedSavingsReserve) > 0) lines.push(`Ahorro planificado aún sin apartar este mes: ${m(outlook.plannedSavingsReserve)}.`)
    if (Number(outlook.minimumBuffer) > 0) lines.push(`Colchón mínimo protegido: ${m(outlook.minimumBuffer)}.`)
    if (outlook.excludedCurrencies.length) lines.push(`No incluyo ${outlook.excludedCurrencies.join(', ')} sin una cotización cargada.`)
    if (!compact) lines.push('No incluye fondos de emergencia ni inversiones.')
    return lines.join('\n')
  }
  lines.push(
    'Cómo lo calculo:',
    `• Dinero libre en cuentas gastables: ${m(outlook.freeBalance)}${outlook.creditDebt !== '0.00' ? ` (ya descuenta ${m(outlook.creditDebt)} de deuda de tarjetas)` : ''}`,
    `• Obligaciones pendientes proyectadas: ${m(outlook.pendingObligations)} (punto más bajo previsto: ${m(outlook.lowestProjected)})`,
    `• Ahorro planificado aún sin apartar este mes: ${m(outlook.plannedSavingsReserve)}`,
    `• Colchón mínimo: ${m(outlook.minimumBuffer)}`,
    `• Margen protegido hasta fin de mes: ${m(outlook.protectedCapacity)}`,
  )
  if (outlook.excludedCurrencies.length) lines.push(`No incluyo tus saldos en ${outlook.excludedCurrencies.join(', ')} porque no hay una cotización cargada.`)
  lines.push('No incluye fondos de emergencia ni inversiones: no son dinero libre.')
  return lines.join('\n')
}

export function savingsReply(d: TranquilityDashboard, goals: TranquilityGoal[], today: string) {
  if (!d.config) return 'Todavía no configuraste Tranquilidad Financiera. Entrá a Balance → Tranquilidad Financiera para cargar tus ingresos y tu plan.'
  const m = (value: string) => formatMoney(value, d.currency)
  const lines = ['Tu ahorro este mes:']
  const totals = d.summary.totals
  if (totals) {
    lines.push(`• Planificado (GUARDAR): ${m(totals.future.target)} · Aportado: ${m(totals.future.executed)} · Falta: ${m(totals.future.remaining.startsWith('-') ? '0.00' : totals.future.remaining)}`)
  } else {
    lines.push(`• No puedo dar el total del mes: ${d.warnings.find(w => w.code === 'MISSING_FX' || w.code === 'MISSING_BUDGET')?.message ?? 'faltan datos para calcularlo.'}`)
  }
  const emergency = d.goalMetrics?.emergency
  if (emergency) lines.push(`• Fondo de emergencia: ${m(emergency.current)} de ${m(emergency.target)} (${emergency.progressPct}%). Falta ${m(emergency.shortfall)}.`)
  else lines.push('• Fondo de emergencia: no pude calcularlo (revisá las advertencias en la app).')
  for (const goal of goals) {
    const needed = requiredMonthlyContribution(goal.targetAmount.toFixed(2), goal.allocatedAmount.toFixed(2), goal.targetDate.toISOString().slice(0, 10), today)
    lines.push(`• ${goal.name}: ${formatMoney(goal.allocatedAmount.toFixed(2), goal.currency)} de ${formatMoney(goal.targetAmount.toFixed(2), goal.currency)} para el ${formatDate(goal.targetDate.toISOString(), new Date(), false)}${needed ? ` · necesitás aportar ${formatMoney(needed, goal.currency)}/mes` : ''}`)
  }
  return lines.join('\n')
}
