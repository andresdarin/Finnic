import { ArrowRightLeft, ArrowUpRight, CreditCard, Receipt, RefreshCw, WalletCards, type LucideIcon } from 'lucide-react'
import { formatMovementAmount, getMovementDisplayTitle, getMovementSubtitleParts } from './utils'
import type { FinancialMovementType, Movement } from './types'

export const MOVEMENT_TYPE_LABELS: Record<FinancialMovementType, string> = {
  EXPENSE: 'Egreso',
  INCOME: 'Ingreso',
  TRANSFER: 'Transferencia',
  FX: 'Cambio de moneda',
  CARD_PAYMENT: 'Pago de tarjeta',
}

export interface MovementPresentation {
  type: FinancialMovementType
  label: string
  Icon: LucideIcon
  /** Borde y color del ícono circular. */
  iconClass: string
  amountClass: string
  title: string
  subtitle: string
  amount: string
}

const TONES: Record<FinancialMovementType, { Icon: LucideIcon; iconClass: string; amountClass: string }> = {
  EXPENSE: { Icon: WalletCards, iconClass: 'border-border/80 text-foreground', amountClass: 'text-foreground' },
  INCOME: { Icon: ArrowUpRight, iconClass: 'border-[#2E7D6A]/30 text-[#2E7D6A] dark:text-[#4BE3B5]', amountClass: 'text-[#2E7D6A] dark:text-[#4BE3B5]' },
  FX: { Icon: RefreshCw, iconClass: 'border-[#A58D66]/40 text-[#7A6440] dark:text-[#A58D66]', amountClass: 'text-[#7A6440] dark:text-[#A58D66]' },
  TRANSFER: { Icon: ArrowRightLeft, iconClass: 'border-[#407E8C]/40 text-[#407E8C] dark:text-[#C0D5D6]', amountClass: 'text-[#407E8C] dark:text-[#C0D5D6]' },
  CARD_PAYMENT: { Icon: CreditCard, iconClass: 'border-[#407E8C]/40 text-[#407E8C] dark:text-[#C0D5D6]', amountClass: 'text-foreground' },
}

function fxPair(m: Movement): string | null {
  if (m.sourceAmount == null || m.destinationAmount == null) return null
  return `${formatMovementAmount(m.sourceAmount, m.currency)} → ${formatMovementAmount(m.destinationAmount, m.currency === 'USD' ? 'UYU' : 'USD')}`
}

/** Cómo se muestra un movimiento (lista, tabla y detalle comparten esta única fuente). */
export function movementPresentation(m: Movement): MovementPresentation {
  const type = m.financialType ?? 'EXPENSE'
  const tone = TONES[type]
  const withReceipt = type === 'EXPENSE' && m.itemsCount > 0
  const pair = type === 'FX' ? fxPair(m) : null
  const abs = formatMovementAmount(Math.abs(m.total), m.currency)

  const title = type === 'CARD_PAYMENT' ? `Pago ${m.paymentMethod ?? m.title}`
    : type === 'FX' ? 'Cambio de moneda'
    : getMovementDisplayTitle(m)
  const amount = pair ?? (type === 'INCOME' ? `+${abs}` : type === 'EXPENSE' ? `-${abs}` : formatMovementAmount(m.total, m.currency))

  return {
    type,
    label: MOVEMENT_TYPE_LABELS[type],
    Icon: withReceipt ? Receipt : tone.Icon,
    iconClass: withReceipt ? 'border-primary/30 text-primary' : tone.iconClass,
    amountClass: tone.amountClass,
    title,
    subtitle: pair ?? getMovementSubtitleParts(m).join(' · '),
    amount,
  }
}
