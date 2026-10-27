'use client'

import React from 'react'
import Link from 'next/link'
import { ShoppingBag, ArrowDownLeft, ArrowLeftRight, Plus } from 'lucide-react'
import { useDashboardData } from '../DashboardData'
import DashboardDataState from './DashboardDataState'
import { parseCalendarDate } from '@/lib/dates'

/**
 * Lista de movimientos recientes en el Dashboard.
 * Diseño minimalista con badges circulares, tipografía alineada y contención total.
 */
export default function DashboardRecentMovements() {
  const { expenses, loading, error } = useDashboardData()
  const recent = [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-surface p-4 sm:p-5 shadow-xs">
      {/* Header con título y enlace a mes completo alineados */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <h2 className="text-sm sm:text-base font-semibold text-foreground truncate min-w-0">
          Últimos movimientos
        </h2>
        <Link
          href="/finanzas"
          className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors shrink-0 underline-offset-4 hover:underline"
        >
          Ver mes completo
        </Link>
      </div>

      <p className="mt-0.5 truncate text-xs text-muted-foreground min-w-0">
        Movimientos personales del mes actual
      </p>

      {loading || error ? (
        <DashboardDataState />
      ) : recent.length ? (
        <ul className="mt-3 divide-y divide-border/50 min-w-0">
          {recent.map((row) => {
            const income = row.movementType === 'INCOME'
            const transfer = row.movementType === 'TRANSFER'
            const Icon = transfer ? ArrowLeftRight : income ? ArrowDownLeft : ShoppingBag

            return (
              <li key={row.id} className="flex items-center gap-2.5 py-2.5 min-w-0">
                {/* Badge circular compacto estilo check con bolsita de compras */}
                <div
                  aria-hidden="true"
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full shadow-xs ${
                    income
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                      : transfer
                      ? 'bg-[#407E8C] text-white dark:bg-[#356975]'
                      : 'bg-[#083A4F] text-[#F5F2EE] dark:bg-[#407E8C] dark:text-[#F5F2EE]'
                  }`}
                >
                  <Icon size={11} className="shrink-0 stroke-[2.2]" />
                </div>

                {/* Título y categoría/fecha perfectamente alineados */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs sm:text-sm font-medium text-foreground" title={row.title}>
                    {row.title}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {transfer ? 'Transferencia' : income ? 'Ingreso' : 'Egreso'} ·{' '}
                    {parseCalendarDate(row.date).toLocaleDateString('es-UY', {
                      timeZone: 'UTC',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>

                {/* Importe alineado a la derecha */}
                <span className="shrink-0 text-right text-xs sm:text-sm font-semibold tabular-nums text-foreground">
                  {new Intl.NumberFormat('es-UY', {
                    style: 'currency',
                    currency: row.currency || 'UYU',
                  }).format(row.amount)}
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="py-7 text-center text-xs sm:text-sm">
          <p className="font-medium text-foreground">Tu mes empieza acá</p>
          <p className="mt-1 text-muted-foreground">
            Registrá un ingreso o gasto para entender cómo cambia tu dinero.
          </p>
        </div>
      )}

      {/* Botón de acción principal minimalista y proporcionado */}
      <Link
        href="/expenses/new"
        className="mt-3.5 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#083A4F] px-4 text-xs sm:text-sm font-semibold text-[#F5F2EE] hover:bg-[#0B465D] active:scale-[0.99] transition-all shadow-xs dark:bg-[#407E8C] dark:hover:bg-[#356975]"
      >
        <Plus size={15} className="shrink-0 stroke-[2.4]" />
        <span className="truncate">Registrar movimiento</span>
      </Link>
    </section>
  )
}
