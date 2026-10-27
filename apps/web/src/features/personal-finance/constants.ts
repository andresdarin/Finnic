export const EXPENSE_TYPES = [
  { value: 'fixed', label: 'Fijo', description: 'Alquiler, UTE, OSE, internet...' },
  { value: 'variable', label: 'Variable', description: 'Delivery, transporte, salud...' },
  { value: 'supermarket', label: 'Supermercado', description: 'Compra con detalle por ítem' },
] as const

export const inputCls =
  'neu-inset h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-base font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors sm:text-sm'

export const CURRENCY_OPTIONS = [
  { value: 'UYU', label: 'UYU ($)' },
  { value: 'USD', label: 'USD (U$S)' },
]

export const INCOME_CATEGORIES = [
  { value: 'sueldo', label: 'Sueldo / Salario' },
  { value: 'honorarios', label: 'Honorarios / Freelance' },
  { value: 'venta', label: 'Venta de artículo' },
  { value: 'reembolso', label: 'Reembolso / Devolución' },
  { value: 'otros_ingresos', label: 'Otros ingresos' },
]

export const FIXED_CATEGORIES = [
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'ute', label: 'UTE' },
  { value: 'ose', label: 'OSE' },
  { value: 'antel', label: 'Antel' },
  { value: 'internet', label: 'Internet' },
  { value: 'gastos_comunes', label: 'Gastos Comunes' },
  { value: 'otros_fijos', label: 'Otros' },
] as const

export const VARIABLE_CATEGORIES = [
  { value: 'delivery', label: 'Delivery' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'salud', label: 'Salud' },
  { value: 'ocio', label: 'Ocio' },
  { value: 'mascotas', label: 'Mascotas' },
  { value: 'compras', label: 'Compras' },
  { value: 'otros_variables', label: 'Otros' },
] as const

export const SUPERMARKET_ITEM_CATEGORIES = [
  { value: 'alimentos', label: 'Alimentos' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'higiene', label: 'Higiene' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'mascotas', label: 'Mascotas' },
  { value: 'farmacia', label: 'Farmacia' },
  { value: 'otros_super', label: 'Otros' },
] as const

export const CATEGORY_LABELS: Record<string, string> = {
  alquiler: 'Alquiler',
  ute: 'UTE',
  ose: 'OSE',
  antel: 'Antel',
  internet: 'Internet',
  gastos_comunes: 'Gastos Comunes',
  otros_fijos: 'Otros',
  delivery: 'Delivery',
  transporte: 'Transporte',
  salud: 'Salud',
  ocio: 'Ocio',
  mascotas: 'Mascotas',
  compras: 'Compras',
  otros_variables: 'Otros',
  alimentos: 'Alimentos',
  bebidas: 'Bebidas',
  limpieza: 'Limpieza',
  higiene: 'Higiene',
  snacks: 'Snacks',
  farmacia: 'Farmacia',
  otros_super: 'Otros',
  supermercado: 'Supermercado',
}

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function monthLabel(monthKey: string): string {
  const parts = monthKey.split('-')
  const y = parts[0] ?? ''
  const idx = parseInt(parts[1] ?? '0') - 1
  return `${MONTH_NAMES[idx] ?? ''} ${y}`
}

export function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function formatCurrency(n: number, currency: 'UYU' | 'USD' = 'UYU'): string {
  return `${currency === 'USD' ? 'US$ ' : '$ '}${n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' })
}

/** Textos de las "i" de Finanzas. */
export const FINANZAS_HINTS = {
  balanceNeto: 'Lo que te entró menos lo que gastaste este mes. No es tu saldo en el banco.',
} as const
