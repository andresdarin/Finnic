import { AlertTriangle, ChevronDown } from 'lucide-react'
import type { TranquilityDashboard } from '../types'

const important = new Set(['MISSING_FX', 'UNRECONCILED_BALANCE', 'INVALID_LEGACY', 'PLAN_DEFICIT', 'GOAL_OVERALLOCATED', 'MISSING_BUDGET'])
const labels: Record<string, string> = {
  MISSING_FX: 'Falta una conversión de moneda',
  UNRECONCILED_BALANCE: 'Saldo pendiente de conciliar',
  INVALID_LEGACY: 'Registro histórico inválido',
  PERSONAL_SCOPE: 'Solo tus registros personales',
  PLAN_DEFICIT: 'El plan no cierra',
  GOAL_OVERALLOCATED: 'Metas con más capital del disponible',
  UNCATEGORIZED: 'Gastos sin categoría de presupuesto',
  MISSING_BUDGET: 'Todavía no armaste el presupuesto del mes',
}
const MAX_AFFECTED = 3

/**
 * Avisos que limitan la vista, plegados por defecto para no tapar el resto de la pantalla.
 * Nunca muestra códigos internos: si falta la traducción, usa un título genérico.
 */
export function WarningList({ dashboard }: { dashboard: TranquilityDashboard }) {
  const warnings = [...new Map(dashboard.warnings.map(warning => [`${warning.code}:${warning.message}`, warning])).values()]
  if (!warnings.length) return null
  const urgent = warnings.some(warning => important.has(warning.code))

  return (
    <details className={`group neu-raised rounded-3xl border p-5 sm:p-6 ${urgent ? 'border-warning/40 bg-accent-soft/60' : 'border-border/40 bg-surface/70 dark:bg-surface/60'}`}>
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-warning/15 text-warning">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-foreground">
            {warnings.length === 1 ? '1 dato para revisar' : `${warnings.length} datos para revisar`}
          </span>
          <span className="block text-xs text-muted-foreground">No ocultamos movimientos ni convertimos faltantes en ceros.</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>

      <ul className="mt-4 space-y-3 border-t border-border/40 pt-4">
        {warnings.map(warning => {
          const affected = (warning.movementIds ?? [])
            .map(id => dashboard.movements.find(movement => movement.id === id))
            .filter((movement): movement is NonNullable<typeof movement> => Boolean(movement))
          const rest = affected.length - MAX_AFFECTED
          return (
            <li key={`${warning.code}:${warning.message}`} className="text-sm">
              <strong className="font-semibold text-foreground">{labels[warning.code] ?? 'Dato para revisar'}</strong>
              <p className="mt-0.5 text-pretty text-muted-foreground">{warning.message}</p>
              {affected.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Afecta: {affected.slice(0, MAX_AFFECTED).map(movement => movement.concept).join(', ')}
                  {rest > 0 && ` y ${rest} más`}.{' '}
                  <button type="button" className="font-semibold text-primary underline-offset-4 hover:underline" onClick={() => document.getElementById('movimientos')?.scrollIntoView({ behavior: 'smooth' })}>
                    Ver movimientos
                  </button>
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </details>
  )
}
