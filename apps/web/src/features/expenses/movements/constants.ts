export const KIND_LABELS: Record<string, string> = {
  fixed: 'Fijo',
  variable: 'Variable',
  supermarket: 'Supermercado',
  subscription: 'Suscripción',
  debt: 'Deuda',
  other: 'Otro',
}

export const KIND_SHORT_LABELS: Record<string, string> = {
  fixed: 'Fijo mensual',
  variable: 'Variable',
  supermarket: 'Supermercado',
  subscription: 'Suscripción',
  debt: 'Deuda',
  other: 'Otro',
}

export const KIND_TONES: Record<string, string> = {
  fixed: 'bg-cat-home-bg text-cat-home border-cat-home/20',
  variable: 'bg-surface-soft text-muted-foreground border-border',
  supermarket: 'bg-cat-super-bg text-cat-super border-cat-super/20',
  subscription: 'bg-cat-delivery-bg text-cat-delivery border-cat-delivery/20',
  debt: 'bg-cat-snacks-bg text-cat-snacks border-cat-snacks/20',
  other: 'bg-surface-soft text-muted-foreground border-border',
}

export const SCOPE_LABELS: Record<string, string> = {
  personal: 'Personal',
  household: 'Hogar',
}

export const SCOPE_ICONS: Record<string, string> = {
  personal: 'User',
  household: 'Heart',
}

export const KIND_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'fixed', label: 'Fijo' },
  { value: 'variable', label: 'Variable' },
  { value: 'supermarket', label: 'Supermercado' },
  { value: 'subscription', label: 'Suscripción' },
  { value: 'debt', label: 'Deuda' },
  { value: 'other', label: 'Otro' },
] as const

export const SCOPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'personal', label: 'Personal' },
  { value: 'household', label: 'Hogar' },
] as const

export const MONTH_LABELS_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
] as const

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const

export function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function formatMonthLabel(value: string): string {
  const [year, month] = value.split('-')
  const m = Number(month)
  if (!year || !m || m < 1 || m > 12) return value
  return `${monthNames[m - 1]} de ${year}`
}

/** Ancho útil mínimo del cuerpo de la página para mostrar el detalle en columna (tabla ~600 + columna 380 + separación). */
export const DETAIL_COLUMN_MIN_WIDTH = 1000
