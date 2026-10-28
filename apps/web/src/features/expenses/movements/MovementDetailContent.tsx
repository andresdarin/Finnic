'use client'

import { X } from 'lucide-react'
import { formatDate, formatMovementAmount } from './utils'
import { movementPresentation } from './presentation'
import type { Movement } from './types'

interface Props {
  movement: Movement
  onClose: () => void
}

/** Cabecera, monto, atributos y notas de un movimiento. Lo envuelven el drawer (móvil) y la columna (desktop). */
export default function MovementDetailContent({ movement, onClose }: Props) {
  const { type, label, title, amount, amountClass } = movementPresentation(movement)
  const rate = movement.exchangeRate ? `1 USD = ${formatMovementAmount(movement.exchangeRate, 'UYU')}` : null

  const fields = [
    ['Tipo', label],
    ['Categoría', movement.category],
    ['Cuenta origen', movement.accountName],
    ['Cuenta destino', movement.destinationAccountName],
    ['Medio de pago', movement.paymentMethod],
    ['Fecha', formatDate(movement.date)],
    ['Comercio', movement.merchant],
    ['Ticket asociado', movement.ticketId ? `#${movement.ticketId.slice(0, 8)}` : null],
    ['Tasa histórica', rate],
  ].filter((field): field is [string, string] => Boolean(field[1]))

  return (
    <>
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4 border-b border-border/60 p-6">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#A58D66]">{label}</span>
          <h2 className="mt-1 truncate text-lg sm:text-xl font-bold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(movement.date)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-full p-2 text-muted-foreground hover:bg-surface-soft hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Monto Principal */}
      <div className="border-b border-border/60 p-6 bg-surface-soft/30">
        <p className="text-xs font-semibold text-muted-foreground mb-1">Monto total</p>
        <p className={`text-3xl font-extrabold tabular-nums tracking-tight ${amountClass}`}>{amount}</p>
        {type === 'FX' && rate && (
          <p className="mt-2 text-xs font-semibold text-[#A58D66]">Cotización real: {rate}</p>
        )}
      </div>

      {/* Atributos / Campos */}
      <dl className="px-6 py-3 divide-y divide-border/40 flex-1">
        {fields.map(([fieldLabel, value]) => (
          <div key={fieldLabel} className="flex justify-between items-center gap-4 py-3">
            <dt className="text-xs font-semibold text-muted-foreground">{fieldLabel}</dt>
            <dd className="max-w-[65%] truncate text-right text-xs font-bold text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Notas / Observaciones */}
      {movement.notes && (
        <div className="m-6 rounded-2xl bg-surface-soft border border-border/70 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notas / Observaciones</p>
          <p className="mt-1.5 whitespace-pre-wrap text-xs text-foreground font-medium leading-relaxed">{movement.notes}</p>
        </div>
      )}
    </>
  )
}
