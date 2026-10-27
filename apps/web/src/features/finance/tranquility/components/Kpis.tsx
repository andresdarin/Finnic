import type { TranquilityDashboard } from '../types'
import { availableToSpend, money } from '../utils'
import { Card } from './Primitives'

export function Kpis({ dashboard }: { dashboard: TranquilityDashboard }) {
  const totals = dashboard.summary.totals
  const investment = dashboard.pools.investment
  const emergency = dashboard.pools.emergency
  const metrics = dashboard.goalMetrics
  const values = [
    ['Ingreso del mes', totals?.plannedIncome ?? null, 'Referencia del presupuesto guardado'],
    ['Disponible para gastar', availableToSpend(dashboard), 'Objetivos de necesidades + deseos menos gasto real'],
    ['Aportes reales', totals?.netPoolFunding ?? null, 'Transferencias netas a fondos'],
    ['Capital invertido', investment.netContributedCapital, 'Capital aportado, sin ganancias'],
    ['Saldo de emergencia', emergency.balance, metrics ? `${metrics.emergency.monthsCovered?.toFixed(1) ?? '—'} meses cubiertos` : 'Meta no disponible'],
  ] as const
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{values.map(([label, value, hint]) => <Card key={label} className="min-h-32"><p className="text-sm text-muted-foreground">{label}</p><p className="financial-number mt-3 text-2xl text-foreground">{money(value, dashboard.currency)}</p><p className="mt-2 text-xs text-muted-foreground">{hint}</p></Card>)}</div>
}
