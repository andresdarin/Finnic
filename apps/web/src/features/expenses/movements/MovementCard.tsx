'use client'

import { ArrowRightLeft, ArrowUpRight, CreditCard, Receipt, WalletCards, ChevronRight, RefreshCw } from 'lucide-react'
import { formatMovementAmount, getMovementDisplayTitle, getMovementSubtitleParts } from './utils'
import type { Movement } from './types'

interface Props {
  movement: Movement
  onClick: (m: Movement) => void
}

export default function MovementCard({ movement, onClick }: Props) {
  const type = movement.financialType ?? 'EXPENSE'
  const isIncome = type === 'INCOME'
  const isFX = type === 'FX'
  const isTransfer = type === 'TRANSFER'
  const isCardPayment = type === 'CARD_PAYMENT'

  // Icono y color semántico
  let iconComponent = <WalletCards className="h-4 w-4 stroke-[2]" />
  let borderClass = 'border-border/80 text-foreground bg-transparent'
  let amountClass = 'text-foreground'

  if (isIncome) {
    iconComponent = <ArrowUpRight className="h-4 w-4 stroke-[2.2]" />
    borderClass = 'border-[#2E7D6A]/30 text-[#2E7D6A] dark:text-[#4BE3B5] bg-transparent'
    amountClass = 'text-[#2E7D6A] dark:text-[#4BE3B5]'
  } else if (isFX) {
    iconComponent = <RefreshCw className="h-4 w-4 stroke-[2]" />
    borderClass = 'border-[#A58D66]/40 text-[#A58D66] bg-transparent'
    amountClass = 'text-[#A58D66]'
  } else if (isTransfer) {
    iconComponent = <ArrowRightLeft className="h-4 w-4 stroke-[2]" />
    borderClass = 'border-[#407E8C]/40 text-[#407E8C] dark:text-[#C0D5D6] bg-transparent'
    amountClass = 'text-[#407E8C] dark:text-[#C0D5D6]'
  } else if (isCardPayment) {
    iconComponent = <CreditCard className="h-4 w-4 stroke-[2]" />
    borderClass = 'border-[#407E8C]/40 text-[#407E8C] dark:text-[#C0D5D6] bg-transparent'
    amountClass = 'text-foreground'
  } else if (movement.itemsCount > 0) {
    iconComponent = <Receipt className="h-4 w-4 stroke-[2]" />
    borderClass = 'border-primary/30 text-primary bg-transparent'
  }

  const title = isCardPayment
    ? `Pago ${movement.paymentMethod ?? movement.title}`
    : isFX
    ? 'Cambio de moneda'
    : getMovementDisplayTitle(movement)

  const subtitle = isFX && movement.sourceAmount != null && movement.destinationAmount != null
    ? `${formatMovementAmount(movement.sourceAmount, movement.currency)} → ${formatMovementAmount(movement.destinationAmount, movement.currency === 'USD' ? 'UYU' : 'USD')}`
    : getMovementSubtitleParts(movement).join(' · ')

  // Formato de Monto
  const amountDisplay = isFX && movement.sourceAmount != null && movement.destinationAmount != null
    ? `${formatMovementAmount(movement.sourceAmount, movement.currency)} → ${formatMovementAmount(movement.destinationAmount, movement.currency === 'USD' ? 'UYU' : 'USD')}`
    : isIncome
    ? `+${formatMovementAmount(Math.abs(movement.total), movement.currency)}`
    : type === 'EXPENSE'
    ? `-${formatMovementAmount(Math.abs(movement.total), movement.currency)}`
    : formatMovementAmount(movement.total, movement.currency)

  return (
    <button
      type="button"
      onClick={() => onClick(movement)}
      className="group flex w-full items-center gap-3 border-b border-border/40 py-3.5 text-left transition-colors hover:bg-surface-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 first:pt-3.5 last:border-b-0"
    >
      {/* Icono semántico outline */}
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${borderClass}`}>
        {iconComponent}
      </span>

      {/* Título y Metadata */}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs sm:text-sm font-bold text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {subtitle || 'Sin detalles adicionales'}
        </span>
      </span>

      {/* Monto y Chevron */}
      <span className="flex max-w-[50%] shrink-0 items-center gap-1.5 pl-2">
        <span className={`text-right text-xs sm:text-sm font-bold tabular-nums ${amountClass}`}>
          {amountDisplay}
        </span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}
