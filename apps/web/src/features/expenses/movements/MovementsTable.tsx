'use client'

import type { KeyboardEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import MovementsTableRow from './MovementsTableRow'
import { adjacentMovementId } from './selection'
import { formatDateGroup, groupByDate } from './utils'
import type { Movement } from './types'

interface Props {
  movements: Movement[]
  selectedId: string | null
  loading: boolean
  hasMore: boolean
  onSelect: (id: string) => void
  onLoadMore: () => void
}

const HEAD = 'px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground'

/** Movimientos en tabla densa (desktop). ↑/↓ recorren las filas y abren su detalle. */
export default function MovementsTable({ movements, selectedId, loading, hasMore, onSelect, onLoadMore }: Props) {
  const onRowKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const nextId = adjacentMovementId(movements, id, event.key === 'ArrowDown' ? 1 : -1)
    document.querySelector<HTMLButtonElement>(`[data-movement-row="${CSS.escape(nextId)}"]`)?.focus()
    onSelect(nextId)
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-xs">
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">Movimientos del mes</caption>
          <thead className="border-b border-border/60 bg-surface-soft/40">
            <tr>
              <th scope="col" className={`${HEAD} pl-5`}>Concepto</th>
              <th scope="col" className={`${HEAD} w-[16%]`}>Categoría</th>
              <th scope="col" className={`${HEAD} hidden w-[16%] xl:table-cell`}>Cuenta / medio</th>
              <th scope="col" className={`${HEAD} w-[13%]`}>Tipo</th>
              <th scope="col" className={`${HEAD} w-[18%] pr-5 text-right`}>Monto</th>
            </tr>
          </thead>
          {Object.entries(groupByDate(movements)).map(([dateKey, items]) => (
            <tbody key={dateKey}>
              <tr>
                <th scope="rowgroup" colSpan={5} className="bg-background/60 px-5 pb-1.5 pt-4 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  {formatDateGroup(items[0]!.date)}
                </th>
              </tr>
              {items.map((m) => (
                <MovementsTableRow key={m.id} movement={m} selected={m.id === selectedId} onSelect={onSelect} onKeyDown={onRowKeyDown} />
              ))}
            </tbody>
          ))}
        </table>
      </div>

      {loading && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {hasMore && !loading && (
        <div className="flex justify-center">
          <button type="button" onClick={onLoadMore}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface-soft px-6 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
            <ChevronDown className="h-4 w-4" />
            Cargar más
          </button>
        </div>
      )}
    </div>
  )
}
