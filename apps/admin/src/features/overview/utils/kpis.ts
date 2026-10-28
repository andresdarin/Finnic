import type { AdminMetrics } from '@lovehold/shared'
import { formatNumber, formatPercent } from '@/lib/format'

export interface Kpi {
  label: string
  value: string
  hint?: string
}

const orDash = (value: number | null) => (value === null ? '—' : formatNumber(value))

/** Traduce las métricas de la API a tarjetas. "—" cuando la base no expone el último acceso. */
export function buildKpis(m: AdminMetrics): Kpi[] {
  const activityHint = m.users.active7d === null ? 'Sin acceso a auth.users' : undefined
  return [
    { label: 'Usuarios', value: formatNumber(m.users.total) },
    { label: 'Nuevos · 7 días', value: formatNumber(m.users.new7d), hint: `${formatNumber(m.users.new30d)} en 30 días` },
    { label: 'Activos · 7 días', value: orDash(m.users.active7d), hint: activityHint ?? `${orDash(m.users.active30d)} en 30 días` },
    { label: 'Hogares', value: formatNumber(m.households) },
    { label: 'Gastos personales', value: formatNumber(m.expenses.personal) },
    { label: 'Gastos de hogar', value: formatNumber(m.expenses.household) },
    { label: 'WhatsApp vinculado', value: formatNumber(m.whatsappLinked), hint: `${formatPercent(m.whatsappLinked, m.users.total)} de los usuarios` },
    { label: 'Ejecuciones IA · 30 días', value: formatNumber(m.ai.runs30d), hint: `${formatPercent(m.ai.failed30d, m.ai.runs30d)} con error` },
  ]
}
