'use client'

import { ChevronDown } from 'lucide-react'
import MovementCard from './MovementCard'
import MovementSkeleton from './MovementSkeleton'
import MovementEmptyState from './MovementEmptyState'
import { groupByDate, formatDateGroup } from './utils'
import type { Movement } from './types'

interface Props {
  movements: Movement[]
  loading: boolean
  hasMore: boolean
  hasFilters: boolean
  onLoadMore: () => void
  onMovementClick: (m: Movement) => void
  onClearFilters: () => void
}

export default function MovementsList({
  movements, loading, hasMore, hasFilters,
  onLoadMore, onMovementClick, onClearFilters,
}: Props) {
  if (loading && movements.length === 0) {
    return <MovementSkeleton />
  }

  if (!loading && movements.length === 0) {
    return <MovementEmptyState hasFilters={hasFilters} onClearFilters={onClearFilters} />
  }

  const groups = groupByDate(movements)

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([dateKey, items]) => (
        <div key={dateKey}>
          <h3 className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {formatDateGroup(items[0]!.date)}
          </h3>
          <div className="overflow-hidden rounded-3xl border border-border/80 bg-surface px-4 shadow-xs sm:px-5">
            {items.map((m) => (
              <MovementCard key={m.id} movement={m} onClick={onMovementClick} />
            ))}
          </div>
        </div>
      ))}

      {loading && movements.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {hasMore && !loading && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onLoadMore}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface-soft px-6 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <ChevronDown className="h-4 w-4" />
            Cargar más
          </button>
        </div>
      )}
    </div>
  )
}
