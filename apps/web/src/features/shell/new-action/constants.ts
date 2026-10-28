import { ArrowDown, ArrowLeftRight, ArrowUp, RefreshCw, ScanLine, type LucideIcon } from 'lucide-react'

export type NewActionType = 'expense' | 'scan' | 'income' | 'transfer' | 'exchange'

export interface NewAction {
  type: NewActionType
  label: string
  description: string
  icon: LucideIcon
  /** Palabras extra para encontrar la acción en la paleta ⌘K. */
  keywords: string[]
  badge?: string
  /** Clases del ícono y de la tarjeta en la hoja móvil. */
  iconClass: string
  cardClass: string
}

const DEFAULT_CARD = 'border-border/60 bg-surface hover:bg-surface-soft'

/** Única lista de operaciones de "Nuevo": hoja móvil, menú de la sidebar y paleta ⌘K. */
export const NEW_ACTIONS: readonly NewAction[] = [
  { type: 'expense', label: 'Registrar Gasto', description: 'Cargá un egreso manual con monto y categoría', icon: ArrowUp, keywords: ['egreso', 'compra', 'pago'], iconClass: 'bg-primary text-primary-foreground [&>svg]:stroke-[2.5]', cardClass: DEFAULT_CARD },
  { type: 'scan', label: 'Escanear Ticket', description: 'Extraé datos automáticamente con cámara o foto', icon: ScanLine, keywords: ['recibo', 'foto', 'factura'], badge: 'IA', iconClass: 'bg-[#407E8C] text-white [&>svg]:stroke-[2.2]', cardClass: 'border-[#407E8C]/30 bg-[#407E8C]/5 hover:bg-[#407E8C]/10' },
  { type: 'income', label: 'Registrar Ingreso', description: 'Sueldo, honorarios, ventas u otros cobros', icon: ArrowDown, keywords: ['sueldo', 'cobro', 'entrada'], iconClass: 'bg-success/15 text-success [&>svg]:stroke-[2.5]', cardClass: DEFAULT_CARD },
  { type: 'transfer', label: 'Transferencia entre cuentas', description: 'Movimiento de fondos sin impacto en tus gastos', icon: ArrowLeftRight, keywords: ['mover', 'cuenta'], iconClass: 'bg-surface-soft text-foreground [&>svg]:stroke-[2]', cardClass: DEFAULT_CARD },
  { type: 'exchange', label: 'Compra / Venta de Moneda', description: 'Arbitraje de divisas UYU / USD con tipo de cambio', icon: RefreshCw, keywords: ['dólares', 'divisa', 'cambio'], iconClass: 'bg-[#A58D66]/15 text-[#A58D66] [&>svg]:stroke-[2]', cardClass: DEFAULT_CARD },
]
