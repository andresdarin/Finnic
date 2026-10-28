'use client'

import MovementsList from './MovementsList'
import MovementsTable from './MovementsTable'
import MovementSkeleton from './MovementSkeleton'
import MovementEmptyState from './MovementEmptyState'
import type { Movement } from './types'

interface Props {
  desktop: boolean
  movements: Movement[]
  selectedId: string | null
  loading: boolean
  hasMore: boolean
  hasFilters: boolean
  onSelect: (id: string) => void
  onLoadMore: () => void
  onClearFilters: () => void
}

/** Lista de cards en móvil, tabla densa en desktop; mismos estados de carga y vacío. */
export default function MovementsResults({ desktop, movements, selectedId, loading, hasMore, hasFilters, onSelect, onLoadMore, onClearFilters }: Props) {
  if (!desktop) {
    return (
      <MovementsList
        movements={movements}
        loading={loading}
        hasMore={hasMore}
        hasFilters={hasFilters}
        onLoadMore={onLoadMore}
        onMovementClick={(m) => onSelect(m.id)}
        onClearFilters={onClearFilters}
      />
    )
  }
  if (loading && movements.length === 0) return <MovementSkeleton />
  if (movements.length === 0) return <MovementEmptyState hasFilters={hasFilters} onClearFilters={onClearFilters} />
  return <MovementsTable movements={movements} selectedId={selectedId} loading={loading} hasMore={hasMore} onSelect={onSelect} onLoadMore={onLoadMore} />
}
