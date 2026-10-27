import type { TranquilityDashboard } from '../types'
import { Card, SectionTitle } from './Primitives'
import { money } from '../utils'

const DETAILS = {
  emergency: 'Objetivo: gastos esenciales mensuales × meses configurados (no el sueldo).',
  accumulation: 'Meta personal configurable: aporte mensual × multiplicador. No es una fórmula de independencia financiera. Usa solo inversión no asignada a metas.',
  financialIndependence: 'Estimador con supuestos: gasto anual objetivo ÷ tasa de retiro configurable. Sin rentabilidad garantizada; excluye emergencia y capital asignado a metas.',
} as const

export function GoalsPanel({ dashboard }: { dashboard: TranquilityDashboard }) {
  const metrics = dashboard.goalMetrics
  if (!metrics) return <Card><SectionTitle eyebrow="LLEGAR" title="Metas todavía no disponibles" detail="El servidor necesita datos comparables para calcular progreso real." /></Card>
  const cards = [
    ['emergency', 'Fondo de emergencia', metrics.emergency],
    ['accumulation', `Meta personal ×${metrics.accumulation.multiplier}`, metrics.accumulation],
    ['financialIndependence', 'Independencia financiera', metrics.financialIndependence],
  ] as const
  return <div className="grid gap-4 md:grid-cols-3">{cards.map(([key, title, metric]) => <Card key={key}>
    <SectionTitle title={title} detail={DETAILS[key]} />
    <p className="financial-number text-2xl">{money(metric.current, dashboard.currency)}</p>
    <p className="mt-2 text-sm text-muted-foreground">Meta: {money(metric.target, dashboard.currency)}</p>
    <p className="mt-1 text-sm text-muted-foreground">Progreso: {metric.progressPct.toFixed(2)}%</p>
    <p className="mt-1 text-sm text-muted-foreground">Faltan: {money(metric.shortfall, dashboard.currency)}</p>
    {key === 'emergency' && <p className="mt-1 text-sm text-muted-foreground">Cobertura: {metric.monthsCovered == null ? 'Sin datos' : `${metric.monthsCovered.toFixed(1)} meses`} · Tiempo: {metric.monthsToGoal == null ? 'no estimable' : `${metric.monthsToGoal} meses`}</p>}
    {key === 'accumulation' && <p className="mt-1 text-sm text-muted-foreground">Multiplicador configurado: {metric.multiplier.toFixed(2)}× · Aporte mensual: {money(dashboard.config?.monthlyContribution, dashboard.currency)}</p>}
    {key === 'financialIndependence' && <><p className="mt-1 text-sm text-muted-foreground">Retiro mensual estimado: {money(metric.estimatedMonthlyWithdrawal, dashboard.currency)}</p><p className="mt-1 text-sm text-muted-foreground">{metric.yearsToGoal === 0 ? 'Meta alcanzada' : metric.yearsToGoal == null ? 'Tiempo no estimable con los datos actuales' : `${metric.yearsToGoal} años estimados`}</p></>}
  </Card>)}</div>
}
