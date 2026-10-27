'use client'

import React, { useMemo, useState } from 'react'
import { PackageOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import CustomSelect from '@/components/ui/CustomSelect'
import { formatCurrency } from './constants'
import type { PersonalExpenseItem } from './types'

interface ProductRankingItemExtended {
  name: string
  normalizedName: string
  count: number
  totalQuantity: number
  totalSpent: number
  isWeight: boolean
}

interface ProductMonthlyRankingProps {
  items: PersonalExpenseItem[]
  currency?: 'UYU' | 'USD'
}

type SortBy = 'totalSpent' | 'count'

const PAGE_SIZES = [5, 10, 25, 50]

function computeRanking(items: PersonalExpenseItem[], sortBy: SortBy): ProductRankingItemExtended[] {
  if (!items?.length) return []

  const normalizeString = (str: string): string => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\b\d+(?:g|gr|grs|kg|kgs|ml|l|cc|u|un|und|unid)\b/g, '')
      .trim()
      .replace(/\s+/g, ' ')
  }

  // Step 1: Initial exact grouping of normalized names
  type RawAcc = Record<string, { originalName: string; count: number; totalQuantity: number; totalSpent: number; isWeight: boolean }>
  const rawGrouped = items.reduce<RawAcc>((acc, item) => {
    const clean = normalizeString(item.name)
    if (!clean) return acc
    if (!acc[clean]) {
      acc[clean] = { originalName: item.name, count: 0, totalQuantity: 0, totalSpent: 0, isWeight: false }
    }
    acc[clean].count += 1
    const qty = item.quantity ?? 1
    acc[clean].totalQuantity += qty
    acc[clean].totalSpent += item.totalPrice
    
    // If quantity is decimal or less than 1, it's sold by weight
    if (item.quantity !== null && (item.quantity % 1 !== 0 || item.quantity < 0.999)) {
      acc[clean].isWeight = true
    }
    return acc
  }, {})

  // Step 2: Merge subsets (e.g. "jamon dona coca et negra" into "jamon dona coca")
  const sortedKeys = Object.keys(rawGrouped).sort((a, b) => a.length - b.length)
  const finalGrouped: Record<string, ProductRankingItemExtended> = {}

  for (const key of sortedKeys) {
    const data = rawGrouped[key]
    if (!data) continue
    let merged = false

    for (const existingKey of Object.keys(finalGrouped)) {
      const existingWords = existingKey.split(' ')
      const currentWords = key.split(' ')
      
      const allWordsMatch = existingWords.every((word) => currentWords.includes(word))

      if (allWordsMatch && existingWords.length > 1) {
        const existing = finalGrouped[existingKey]
        if (existing) {
          existing.count += data.count
          existing.totalQuantity += data.totalQuantity
          existing.totalSpent += data.totalSpent
          if (data.isWeight) existing.isWeight = true
          merged = true
          break
        }
      }
    }

    if (!merged) {
      finalGrouped[key] = {
        name: data.originalName.toLowerCase().trim(), // Normalize completely to lowercase
        normalizedName: key,
        count: data.count,
        totalQuantity: data.totalQuantity,
        totalSpent: data.totalSpent,
        isWeight: data.isWeight
      }
    }
  }

  return Object.values(finalGrouped)
    .map((g) => ({ ...g, totalSpent: Math.round(g.totalSpent * 100) / 100 }))
    .sort((a, b) => (sortBy === 'count' ? b.count - a.count : b.totalSpent - a.totalSpent))
}

export default function ProductMonthlyRanking({ items, currency = 'UYU' }: ProductMonthlyRankingProps) {
  const [sortBy, setSortBy] = useState<SortBy>('totalSpent')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const ranking = useMemo(() => computeRanking(items, sortBy), [items, sortBy])
  const totalPages = Math.max(1, Math.ceil(ranking.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = ranking.slice((safePage - 1) * pageSize, safePage * pageSize)

  if (ranking.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <PackageOpen className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No hay productos este mes</p>
      </div>
    )
  }

  const SORT_OPTIONS = [
    { value: 'totalSpent', label: 'Mayor gasto' },
    { value: 'count', label: 'Más unidades' },
  ]

  const PAGE_SIZE_OPTIONS = PAGE_SIZES.map((s) => ({
    value: String(s),
    label: String(s),
  }))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <CustomSelect
            size="sm"
            popoverWidth={130}
            value={sortBy}
            options={SORT_OPTIONS}
            onChange={(val) => { setSortBy(val as SortBy); setPage(1) }}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Mostrar</span>
          <CustomSelect
            size="sm"
            popoverWidth={70}
            value={String(pageSize)}
            options={PAGE_SIZE_OPTIONS}
            onChange={(val) => { setPageSize(Number(val)); setPage(1) }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {paginated.map((item, i) => {
          const rank = (safePage - 1) * pageSize + i + 1
          return (
            <div 
              key={item.normalizedName} 
              className="flex items-center gap-3 bg-transparent pb-3 border-b-[0.5px] border-border/50 last:border-b-0 last:pb-0"
            >
              {/* Número de posición */}
              <span className="w-6 shrink-0 text-sm font-medium text-muted-foreground">
                {rank}
              </span>

              {/* Nombre del producto y cantidad de compras */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground lowercase">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.count} {item.count === 1 ? 'compra' : 'compras'} · {item.isWeight ? `${item.totalQuantity.toFixed(3)} kg` : `${item.totalQuantity} u`}
                </p>
              </div>

              {/* Monto a la derecha */}
              <p className="shrink-0 text-sm font-medium text-foreground">
                {formatCurrency(item.totalSpent, currency)}
              </p>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-primary/45"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs text-muted-foreground">{safePage} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-primary/45"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

