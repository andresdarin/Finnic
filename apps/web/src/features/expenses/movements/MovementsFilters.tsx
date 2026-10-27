'use client'

import { useState } from 'react'
import { Search, SlidersHorizontal, X, RotateCcw, Calendar, DollarSign, Wallet, Layers } from 'lucide-react'
import MovementsMonthPicker from './MovementsMonthPicker'
import CustomDatePicker from '@/components/ui/CustomDatePicker'
import type { MovementFilters } from './types'
import { formatMonthLabel } from './utils'

interface Props {
  filters: MovementFilters
  onChange: (key: keyof MovementFilters, value: string) => void
  onClear: () => void
}

const TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'INCOME', label: 'Ingreso' },
  { value: 'EXPENSE', label: 'Egreso' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'FX', label: 'Cambio de moneda' },
] as const

const CURRENCY_OPTIONS = [
  { value: '', label: 'Todas las monedas' },
  { value: 'UYU', label: 'Pesos Uruguayos (UYU)' },
  { value: 'USD', label: 'Dólares (USD)' },
] as const

export default function MovementsFilters({ filters, onChange, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const activeCount = [
    Boolean(filters.financialType),
    Boolean(filters.currency),
    Boolean(filters.account),
    Boolean(filters.category),
    Boolean(filters.period),
  ].filter(Boolean).length

  return (
    <section className="flex flex-col gap-2.5" aria-label="Buscar y filtrar movimientos">
      {/* 1. Fila Principal: Buscador Pill con lupa a la derecha + Botón Calendario Redondo + Botón Filtros Redondo */}
      <div className="flex items-center gap-2">
        {/* Barra de Búsqueda Estilo Pill con Lupa Redonda Navy a la Derecha */}
        <div className="relative flex-1">
          <input
            type="text"
            value={filters.q}
            onChange={(e) => onChange('q', e.target.value)}
            placeholder="Buscar por comercio, concepto, cuenta..."
            className="neu-inset h-11 w-full rounded-full border border-border/80 bg-surface-soft pl-4 pr-12 text-xs sm:text-sm text-foreground outline-none placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {filters.q ? (
            <button
              type="button"
              onClick={() => onChange('q', '')}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-surface-soft text-muted-foreground hover:bg-border/60 hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-[#083A4F] dark:bg-[#407E8C] text-[#F5F2EE] shadow-xs">
              <Search className="h-3.5 w-3.5 stroke-[2.2]" />
            </div>
          )}
        </div>

        {/* Botón de Calendario Redondo */}
        <MovementsMonthPicker
          value={filters.month}
          onChange={(v) => onChange('month', v)}
          iconOnly
        />

        {/* Botón de Filtros Redondo con Badge */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir filtros"
          title="Filtros de movimientos"
          className={`neu-interactive relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 ${
            activeCount > 0
              ? 'border-primary/40 bg-primary text-primary-foreground'
              : 'border-border/80 bg-surface text-foreground hover:bg-surface-soft hover:border-primary/30'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4 stroke-[2]" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#A58D66] text-white text-[9px] font-extrabold shadow-xs">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* 2. Filtros Activos / Badges y Limpiar */}
      {(activeCount > 0 || filters.q || filters.month) && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 px-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {filters.month && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface border border-border/80 px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                {formatMonthLabel(filters.month)}
                <button type="button" onClick={() => onChange('month', '')} aria-label={`Quitar filtro de ${formatMonthLabel(filters.month)}`} className="relative -mr-1 rounded-full p-0.5 hover:text-danger before:absolute before:-inset-2.5 before:content-['']">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.currency && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface border border-border/80 px-2.5 py-0.5 text-[11px] font-bold text-accent-ink">
                {filters.currency}
                <button type="button" onClick={() => onChange('currency', '')} aria-label={`Quitar filtro de moneda ${filters.currency}`} className="relative -mr-1 rounded-full p-0.5 hover:text-danger before:absolute before:-inset-2.5 before:content-['']">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.financialType && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface border border-border/80 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                {TYPE_OPTIONS.find((t) => t.value === filters.financialType)?.label ?? filters.financialType}
                <button type="button" onClick={() => onChange('financialType', '')} aria-label="Quitar filtro de tipo" className="relative -mr-1 rounded-full p-0.5 hover:text-danger before:absolute before:-inset-2.5 before:content-['']">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors ml-auto"
          >
            <RotateCcw className="h-3 w-3" />
            Limpiar filtros
          </button>
        </div>
      )}

      {/* 3. Modal Completo y Ordenado de Filtros */}
      {open && <FilterSheet filters={filters} onChange={onChange} onClear={onClear} onClose={() => setOpen(false)} />}
    </section>
  )
}

function FilterSheet({ filters, onChange, onClear, onClose }: Props & { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 sm:items-center sm:p-6 select-none"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filtros de movimientos"
        onClick={(e) => e.stopPropagation()}
        className="neu-raised w-full max-w-lg rounded-t-3xl border border-border bg-surface p-6 sm:rounded-3xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Filtros de Movimientos</h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-surface-soft hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Grupos de Filtros Ordenados */}
        <div className="flex flex-col gap-4">
          {/* Tipo de Movimiento */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Tipo de movimiento
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TYPE_OPTIONS.map((t) => {
                const isSelected = (filters.financialType ?? '') === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => onChange('financialType', t.value)}
                    className={`rounded-xl border py-2 px-2.5 text-xs font-semibold text-center transition-all ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                        : 'border-border/80 bg-surface-soft/60 text-muted-foreground hover:bg-surface-soft hover:text-foreground'
                    }`}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Moneda */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <DollarSign className="h-3.5 w-3.5 text-[#A58D66]" />
              Moneda
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CURRENCY_OPTIONS.map((c) => {
                const isSelected = (filters.currency ?? '') === c.value
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => onChange('currency', c.value)}
                    className={`rounded-xl border py-2 px-2.5 text-xs font-semibold text-center transition-all ${
                      isSelected
                        ? 'border-[#A58D66] bg-[#A58D66] text-white shadow-xs'
                        : 'border-border/80 bg-surface-soft/60 text-muted-foreground hover:bg-surface-soft hover:text-foreground'
                    }`}
                  >
                    {c.value ? c.value : 'Todas'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cuenta / Banco */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              Cuenta o Banco
            </label>
            <input
              type="text"
              value={filters.account}
              onChange={(e) => onChange('account', e.target.value)}
              placeholder="Ej: Itaú, Santander, Efectivo..."
              className="h-11 w-full rounded-xl border border-border/80 bg-surface-soft/60 px-3.5 text-xs sm:text-sm text-foreground outline-none transition-all focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Categoría */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-foreground">Categoría</label>
            <input
              type="text"
              value={filters.category}
              onChange={(e) => onChange('category', e.target.value)}
              placeholder="Ej: Supermercado, Alquiler, Salidas..."
              className="h-11 w-full rounded-xl border border-border/80 bg-surface-soft/60 px-3.5 text-xs sm:text-sm text-foreground outline-none transition-all focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Fecha Específica */}
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              Día exacto (opcional)
            </span>
            <CustomDatePicker
              value={filters.period}
              onChange={(value) => onChange('period', value)}
              label="Día exacto"
              placeholder="Cualquier día"
              className="neu-inset w-full rounded-2xl border border-border/50 bg-surface-soft/60 px-3.5 text-base sm:text-sm"
            />
          </div>
        </div>

        {/* Acciones del Modal */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={() => {
              onClear()
              onClose()
            }}
            className="flex-1 rounded-2xl border border-border/80 bg-surface-soft py-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          >
            Limpiar filtros
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl bg-primary py-3 text-xs font-bold text-primary-foreground hover:bg-primary-hover transition-colors shadow-xs"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}
