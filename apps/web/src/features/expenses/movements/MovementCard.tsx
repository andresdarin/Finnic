'use client'

import { ChevronRight } from 'lucide-react'
import { movementPresentation } from './presentation'
import type { Movement } from './types'

interface Props {
  movement: Movement
  onClick: (m: Movement) => void
}

export default function MovementCard({ movement, onClick }: Props) {
  const { Icon, iconClass, amountClass, title, subtitle, amount } = movementPresentation(movement)

  return (
    <button
      type="button"
      onClick={() => onClick(movement)}
      className="group flex w-full items-center gap-3 border-b border-border/40 py-3.5 text-left transition-colors hover:bg-surface-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 first:pt-3.5 last:border-b-0"
    >
      {/* Icono semántico outline */}
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-transparent ${iconClass}`}>
        <Icon className="h-4 w-4 stroke-[2]" />
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
          {amount}
        </span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}
