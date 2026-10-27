import { TranquilityConfigSchema } from '@lovehold/shared/tranquility'
import type { TranquilityConfig, TranquilityCurrency, TranquilityDashboard } from '@lovehold/shared/tranquility'

export function money(value: string | number | null | undefined, currency: TranquilityCurrency = 'UYU') {
  if (value == null || !Number.isFinite(Number(value))) return 'Sin datos'
  return new Intl.NumberFormat('es-UY', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value))
}

export function monthLabel(month: string) {
  const [year = 1970, value = 1] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, value - 1, 1)))
}

export function currentMonth(date = new Date(), timeZone = 'America/Montevideo') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(date)
  const year = parts.find(part => part.type === 'year')?.value ?? '1970'
  const month = parts.find(part => part.type === 'month')?.value ?? '01'
  return `${year}-${month}`
}

export function currentDate(date = new Date(), timeZone = 'America/Montevideo') {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export function shiftMonth(month: string, delta: number) {
  const [year = 1970, value = 1] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, value - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function decimal(value: string) {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null
  const [whole = '0', cents = ''] = normalized.split('.')
  return `${whole.replace(/^0+(?=\d)/, '')}.${cents.padEnd(2, '0')}`
}

export function normalizeMoney(value: string) { return decimal(value) }

export function normalizeConfig(value: TranquilityConfig) {
  const moneyKeys = ['netMonthlyIncome', 'essentialExpenses', 'monthlyContribution', 'emergencyMonthlyContribution', 'futureMonthlyExpense'] as const
  const normalized = { ...value }
  for (const key of moneyKeys) {
    const moneyValue = decimal(String(value[key]))
    if (moneyValue === null) return null
    normalized[key] = moneyValue
  }
  return TranquilityConfigSchema.parse(normalized)
}

export function percentOf(value: string, total: string) {
  const denominator = Number(total)
  return denominator > 0 ? Math.min(100, Math.max(0, Number(value) / denominator * 100)) : 0
}

export function kpiData(dashboard: TranquilityDashboard) {
  const totals = dashboard.summary.totals
  if (!totals) return []
  return [
    ['Ingreso planificado', totals.plannedIncome, 'Referencia mensual'],
    ['Disponible para gastar', (Number(totals.needs.remaining) + Number(totals.wants.remaining)).toFixed(2), 'Necesidades + deseos'],
    ['Ahorro real', totals.netPoolFunding, 'Fondos efectivamente transferidos'],
    ['Patrimonio invertido', dashboard.pools.investment.balance, 'Emergencia se muestra aparte'],
  ] as const
}

export function availableToSpend(dashboard: TranquilityDashboard) {
  const totals = dashboard.summary.totals
  if (!totals) return null
  return (Number(totals.needs.target) + Number(totals.wants.target) - Number(totals.totalExpenses)).toFixed(2)
}

export function categorySpending(dashboard: TranquilityDashboard) {
  const rows = new Map<string, { name: string; amount: number; comparable: boolean }>()
  const categories = new Map(dashboard.categories.map(category => [category.id, category.name]))
  let missingFx = false
  for (const movement of dashboard.movements) {
    if (movement.type !== 'EXPENSE' || !movement.categoryId) continue
    let amount: number | null = null
    if (movement.currency === dashboard.currency) amount = Number(movement.amount)
    else if (movement.fxSnapshot?.toCurrency === dashboard.currency) amount = Number(movement.fxSnapshot.convertedAmount)
    else missingFx = true
    if (amount == null || !Number.isFinite(amount)) continue
    const current = rows.get(movement.categoryId) ?? { name: categories.get(movement.categoryId) ?? 'Sin categoría', amount: 0, comparable: true }
    current.amount += amount
    rows.set(movement.categoryId, current)
  }
  return { rows: [...rows.values()].sort((a, b) => b.amount - a.amount), missingFx }
}

/** La API usa el prefijo global `/api`; algunas rutas de Tranquilidad se escribían sin él. */
export const tranquilityApiPath = (path: string) => (path.startsWith('/api/') ? path : `/api${path.startsWith('/') ? '' : '/'}${path}`)
