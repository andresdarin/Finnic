'use client'

import React, { useState } from 'react'
import { X, ArrowUp, Loader2 } from 'lucide-react'
import CustomDatePicker from '@/components/ui/CustomDatePicker'
import CustomSelect from '@/components/ui/CustomSelect'
import { CURRENCY_OPTIONS, INCOME_CATEGORIES, inputCls } from './constants'
import { useRegisterIncome } from './hooks'

interface IncomeFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function IncomeFormModal({ isOpen, onClose, onSuccess }: IncomeFormModalProps) {
  const { income, submitting } = useRegisterIncome()

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'UYU' | 'USD'>('UYU')
  const [category, setCategory] = useState(INCOME_CATEGORIES[0]?.value ?? 'sueldo')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Ingresá un monto válido mayor a 0.')
      return
    }

    try {
      await income({
        title: title.trim(),
        amount: numAmount,
        currency,
        dueOn: new Date(date).toISOString(),
        category,
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al registrar ingreso')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      <div className="neu-raised relative z-10 my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-border/50 bg-surface p-4 animate-in fade-in zoom-in-95 duration-200 sm:max-h-[calc(100dvh-2rem)] sm:p-6">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <ArrowUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Registrar Ingreso</h2>
              <p className="text-xs text-muted-foreground">Registra el ingreso en tu seguimiento financiero</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-surface-soft hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">Concepto</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={inputCls}
              placeholder="Ej: Sueldo mensual, Cobro de factura"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-[minmax(0,1fr)_7rem] sm:grid-cols-3">
            <div className="min-w-0 sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-foreground">Monto</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className={inputCls}
                placeholder="0.00"
              />
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-semibold text-foreground">Moneda</label>
              <div
                role="radiogroup"
                aria-label="Moneda"
                className="neu-inset grid h-11 grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1"
              >
                {CURRENCY_OPTIONS.map((option, index) => {
                  const isSelected = currency === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={isSelected ? 0 : -1}
                      onClick={() => setCurrency(option.value as 'UYU' | 'USD')}
                      onKeyDown={(event) => {
                        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return
                        event.preventDefault()
                        const nextIndex = event.key === 'Home'
                          ? 0
                          : event.key === 'End'
                            ? CURRENCY_OPTIONS.length - 1
                            : event.key === 'ArrowRight'
                              ? (index + 1) % CURRENCY_OPTIONS.length
                              : (index - 1 + CURRENCY_OPTIONS.length) % CURRENCY_OPTIONS.length
                        const nextOption = CURRENCY_OPTIONS[nextIndex]
                        if (nextOption) {
                          setCurrency(nextOption.value as 'UYU' | 'USD')
                          document.getElementById(`income-currency-${nextOption.value}`)?.focus()
                        }
                      }}
                      id={`income-currency-${option.value}`}
                      className={`rounded-lg px-1 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-surface-soft hover:text-foreground'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground">Categoría</label>
              <CustomSelect
                className="w-full"
                value={category}
                options={INCOME_CATEGORIES}
                onChange={setCategory}
                placeholder="Categoría"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground">Fecha</label>
              <CustomDatePicker value={date} onChange={setDate} required className="w-full" />
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? 'Guardando...' : 'Confirmar Ingreso'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface-soft"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
