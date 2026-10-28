'use client'

import type { KeyboardEvent } from 'react'
import { movementPresentation } from './presentation'
import type { Movement } from './types'

interface Props {
  movement: Movement
  selected: boolean
  onSelect: (id: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, id: string) => void
}

/** Fila de la tabla desktop. El botón del concepto cubre toda la fila (patrón "stretched"). */
export default function MovementsTableRow({ movement, selected, onSelect, onKeyDown }: Props) {
  const { Icon, iconClass, amountClass, title, subtitle, amount, label } = movementPresentation(movement)
  const account = movement.accountName ?? movement.paymentMethod ?? '—'

  return (
    <tr aria-current={selected || undefined} className={`relative border-b border-border/40 last:border-b-0 transition-colors hover:bg-surface-soft/60 ${selected ? 'bg-surface-soft' : ''}`}>
      <td className="py-3 pl-5 pr-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${iconClass}`}>
            <Icon className="h-4 w-4 stroke-[2]" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <button
              type="button"
              data-movement-row={movement.id}
              onClick={() => onSelect(movement.id)}
              onKeyDown={(event) => onKeyDown(event, movement.id)}
              className="block max-w-full truncate text-left text-sm font-bold text-foreground after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-primary/45"
            >
              {title}
            </button>
            <span className="block truncate text-[11px] text-muted-foreground">{subtitle || 'Sin detalles adicionales'}</span>
          </span>
        </div>
      </td>
      <td className="truncate px-3 py-3 text-xs text-muted-foreground">{movement.category || '—'}</td>
      <td className="hidden truncate px-3 py-3 text-xs text-muted-foreground xl:table-cell">{account}</td>
      <td className="px-3 py-3 text-xs font-semibold text-muted-foreground">{label}</td>
      <td className={`whitespace-nowrap py-3 pl-3 pr-5 text-right text-sm font-bold tabular-nums ${amountClass}`}>{amount}</td>
    </tr>
  )
}
