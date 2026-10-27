'use client'

import React, { useState } from 'react'
import { useDashboardData } from '../DashboardData'
import { computeSummary } from '@/features/personal-finance/utils'
import { CATEGORY_LABELS } from '@/features/personal-finance/constants'
import DashboardDataState from './DashboardDataState'
import { InfoHint } from '@/components/ui/InfoHint'
import { DASHBOARD_HINTS } from '../constants'

/**
 * Resumen de gastos por categoría para el Dashboard.
 * Asegura contención estricta en mobile con truncado elíptico en textos largos.
 */
export default function DashboardCategorySummary() {
  const { expenses, loading, error } = useDashboardData()
  const [currency, setCurrency] = useState<'UYU' | 'USD'>('UYU')
  const summary = computeSummary(expenses.filter(row => (row.currency || 'UYU') === currency))
  const categories = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 4)

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-surface p-4 sm:p-6 shadow-xs">
      {/* Header con título y selector de moneda */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-base font-semibold text-foreground truncate min-w-0">
            Dónde se va tu dinero
          </h2>
          <InfoHint label="Dónde se va tu dinero" className="text-muted-foreground">{DASHBOARD_HINTS.categorias}</InfoHint>
        </div>
        <div className="flex shrink-0 gap-1" role="group" aria-label="Moneda de categorías">
          {(['UYU', 'USD'] as const).map(value => (
            <button
              key={value}
              type="button"
              aria-pressed={currency === value}
              onClick={() => setCurrency(value)}
              className={`min-h-9 rounded-lg px-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition-all ${
                currency === value
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-surface-soft'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-1 truncate text-xs sm:text-sm text-muted-foreground min-w-0">
        Principales categorías · solo egresos · {currency}
      </p>

      {loading || error ? (
        <DashboardDataState />
      ) : categories.length ? (
        <ul className="mt-5 space-y-4 sm:space-y-5 min-w-0">
          {categories.map(([name, amount]) => {
            const label = CATEGORY_LABELS[name] || name.replaceAll('_', ' ')
            const percentage = summary.total ? (amount / summary.total) * 100 : 0

            return (
              <li key={name} className="min-w-0">
                <div className="flex items-baseline justify-between gap-3 text-sm min-w-0">
                  <span
                    className="truncate min-w-0 flex-1 capitalize font-medium text-foreground"
                    title={label}
                  >
                    {label}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-right text-foreground">
                    {new Intl.NumberFormat('es-UY', { style: 'currency', currency }).format(amount)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-soft" aria-hidden>
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="py-8 text-sm">
          <p className="font-medium text-foreground">Sin egresos en {currency} este mes</p>
          <p className="mt-1 text-muted-foreground">
            Las categorías aparecerán cuando registres un gasto en esta moneda.
          </p>
        </div>
      )}
    </section>
  )
}
