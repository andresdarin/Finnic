'use client'

import { useCallback, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import PageContainer from '@/components/layout/PageContainer'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/useMediaQuery'
import { useContainerWidth } from '@/hooks/useContainerWidth'
import { useMovements } from './hooks'
import { resolveSelection } from './selection'
import { DETAIL_COLUMN_MIN_WIDTH } from './constants'
import MovementsHeader from './MovementsHeader'
import MovementsFilters from './MovementsFilters'
import MovementsSummaryCards from './MovementsSummaryCards'
import MovementsResults from './MovementsResults'
import MovementDetailDrawer from './MovementDetailDrawer'
import MovementDetailPanel from './MovementDetailPanel'

/** Movimientos: cards + hoja de detalle en móvil; tabla + detalle en columna (o drawer si no entra) en desktop (ADR-005). */
export default function MovementsPageClient() {
  const { movements, summary, pagination, loading, error, filters, setFilter, clearFilters, refresh, loadMore } = useMovements()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const clearSelection = useCallback(() => setSelectedId(null), [])
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [bodyRef, bodyWidth] = useContainerWidth<HTMLDivElement>()
  const columnMode = isDesktop && bodyWidth >= DETAIL_COLUMN_MIN_WIDTH
  const selected = resolveSelection(movements, selectedId)

  const hasFilters = !!(filters.q || filters.kind || filters.scope || filters.category || filters.paymentMethod || filters.financialType || filters.account || filters.currency)

  return (
    <div className="min-h-screen bg-[#F5F2EE] dark:bg-[#071D27] pb-16">
      {/* 1. Hero Superior Full-Bleed Navy */}
      <MovementsHeader />

      {/* 2. Cuerpo: resumen (desktop), filtros y resultados */}
      <PageContainer className="flex flex-col gap-5 py-6">
        <div ref={bodyRef} className="flex flex-col gap-5">
          {isDesktop && <MovementsSummaryCards summary={summary} loading={loading} />}
          <MovementsFilters filters={filters} onChange={setFilter} onClear={clearFilters} />

          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={refresh}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reintentar
              </button>
            </div>
          )}

          <div className={columnMode ? 'grid grid-cols-[minmax(0,1fr)_380px] items-start gap-6' : ''}>
            <MovementsResults
              desktop={isDesktop}
              movements={movements}
              selectedId={columnMode ? selectedId : null}
              loading={loading}
              hasMore={pagination.hasMore}
              hasFilters={hasFilters}
              onSelect={setSelectedId}
              onLoadMore={loadMore}
              onClearFilters={clearFilters}
            />
            {columnMode && <MovementDetailPanel movement={selected} onClose={clearSelection} />}
          </div>
        </div>
      </PageContainer>

      {/* Detalle modal cuando no hay lugar para la columna (siempre en móvil) */}
      {!columnMode && <MovementDetailDrawer movement={selected} onClose={clearSelection} />}
    </div>
  )
}
