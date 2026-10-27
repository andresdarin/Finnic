import type { TranquilityDashboard } from '../types'
import { Card, SectionTitle } from './Primitives'

const important = new Set(['MISSING_FX', 'UNRECONCILED_BALANCE', 'INVALID_LEGACY', 'PLAN_DEFICIT', 'GOAL_OVERALLOCATED'])
const labels: Record<string, string> = { MISSING_FX: 'Falta una conversión de moneda', UNRECONCILED_BALANCE: 'Saldo pendiente de conciliar', INVALID_LEGACY: 'Registro histórico inválido', PERSONAL_SCOPE: 'Alcance personal', PLAN_DEFICIT: 'El plan no cierra', GOAL_OVERALLOCATED: 'Metas con más capital del disponible', UNCATEGORIZED: 'Gasto sin categoría de presupuesto' }

export function WarningList({ dashboard }: { dashboard: TranquilityDashboard }) {
  const warnings = [...new Map(dashboard.warnings.map(warning => [`${warning.code}:${warning.message}`, warning])).values()]
  if (!warnings.length) return null
  return <Card className={warnings.some(warning => important.has(warning.code)) ? 'border-warning/60 bg-accent-soft' : ''}>
    <SectionTitle eyebrow="DATOS A REVISAR" title="Hay información que limita esta vista" detail="No ocultamos movimientos ni convertimos faltantes en ceros." />
    <ul className="space-y-3">{warnings.map(warning => {
      const affected = (warning.movementIds ?? []).map(id => dashboard.movements.find(movement => movement.id === id)).filter(Boolean)
      return <li key={`${warning.code}:${warning.message}`} className="text-sm"><strong>{labels[warning.code] ?? warning.code}</strong><p className="mt-1">{warning.message}</p>{affected.length > 0 && <p className="mt-1 text-muted-foreground">Afecta: {affected.map(movement => `${movement!.concept} (${movement!.date})`).join(', ')}. Revisá estos registros en <button type="button" className="font-semibold text-primary underline" onClick={() => document.getElementById('movimientos')?.scrollIntoView({ behavior: 'smooth' })}>Movimiento</button>.</p>}</li>
    })}</ul>
  </Card>
}
