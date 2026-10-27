'use client'

import React, { useState, useEffect } from 'react'
import { EXPENSE_TYPES, FIXED_CATEGORIES, VARIABLE_CATEGORIES } from './constants'
import ReceiptItemsEditor from './ReceiptItemsEditor'
import CustomDatePicker from '@/components/ui/CustomDatePicker'
import CustomSelect from '@/components/ui/CustomSelect'
import { useFinanceAccounts } from './hooks'
import type { DetectedReceiptItem } from './types'

interface ExpenseFormProps {
  onSubmit: (data: {
    title: string
    merchant?: string
    amount: number
    currency?: 'UYU' | 'USD'
    date: string
    type: string
    category: string
    financeAccountId?: string
    notes?: string
    isRecurring?: boolean
    recurrenceDay?: number
    items?: Omit<DetectedReceiptItem, 'id'>[]
  }) => void
  onCancel: () => void
  submitting: boolean
  initialItems?: DetectedReceiptItem[]
  initialTotal?: number
}

const inputCls =
  'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/45'
const btnCls =
  'rounded-xl px-5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/45'

export default function ExpenseForm({
  onSubmit,
  onCancel,
  submitting,
  initialItems,
  initialTotal,
}: ExpenseFormProps) {
  const { accounts } = useFinanceAccounts()
  const [type, setType] = useState('fixed')
  const [title, setTitle] = useState('')
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState(initialTotal ? String(initialTotal) : '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState<string>(FIXED_CATEGORIES[0].value)
  const [financeAccountId, setFinanceAccountId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceDay, setRecurrenceDay] = useState(new Date().getDate())
  const [items, setItems] = useState<DetectedReceiptItem[]>(initialItems ?? [])

  useEffect(() => {
    const selectedAccountStillExists = accounts.some((account) => account.id === financeAccountId)
    if (!selectedAccountStillExists) {
      setFinanceAccountId(accounts[0]?.id ?? '')
    }
  }, [accounts, financeAccountId])

  const categories =
    type === 'fixed' ? FIXED_CATEGORIES : type === 'variable' ? VARIABLE_CATEGORIES : []
  const itemsTotal = items.reduce((s, i) => s + i.totalPrice, 0)
  const displayAmount =
    type === 'supermarket' && items.length > 0
      ? itemsTotal
      : amount
      ? parseFloat(amount)
      : 0

  const selectedAccount = accounts.find((a) => a.id === financeAccountId)

  const accountOptions = accounts.map((a) => {
    const typeLabel =
      a.type === 'CREDIT' ? 'Crédito' : a.type === 'CASH' ? 'Efectivo' : 'Banco'
    return {
      value: a.id,
      label: `${a.name} (${typeLabel} · ${a.currency})`,
    }
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      title,
      merchant: merchant || undefined,
      amount: displayAmount,
      currency: selectedAccount?.currency,
      date: new Date(date).toISOString(),
      type,
      category: type === 'supermarket' ? 'supermercado' : category,
      financeAccountId: financeAccountId || undefined,
      notes: notes || undefined,
      isRecurring: type === 'fixed' ? isRecurring : undefined,
      recurrenceDay: type === 'fixed' && isRecurring ? recurrenceDay : undefined,
      items: type === 'supermarket' ? items.map(({ id: _id, ...rest }) => rest) : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Tipo de gasto
        </label>
        <div className="flex gap-2">
          {EXPENSE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setType(t.value)
                setCategory(
                  t.value === 'fixed' ? FIXED_CATEGORIES[0].value : VARIABLE_CATEGORIES[0].value,
                )
                setItems([])
              }}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                type === t.value
                  ? 'border-primary bg-primary/10 text-primary font-bold'
                  : 'border-border bg-surface text-muted-foreground hover:border-primary/40'
              }`}
            >
              <div className="text-xs sm:text-sm">{t.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">Título</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={inputCls}
            placeholder={
              type === 'fixed' ? 'Alquiler' : type === 'supermarket' ? 'Supermercado' : 'Delivery'
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">Comercio</label>
          <input
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className={inputCls}
            placeholder="Ej: Tienda Inglesa"
          />
        </div>
      </div>

      {type !== 'supermarket' ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">Monto ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">Fecha</label>
            <CustomDatePicker value={date} onChange={setDate} required className="w-full" />
          </div>
        </div>
      ) : (
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-foreground">
            Ítems del ticket
          </label>
          <ReceiptItemsEditor items={items} onChange={setItems} />
          <p className="mt-2 text-right text-sm font-bold text-foreground">
            Total: ${itemsTotal.toFixed(2)}
          </p>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-semibold text-foreground">Fecha</label>
            <CustomDatePicker value={date} onChange={setDate} required className="w-full" />
          </div>
        </div>
      )}

      {/* Selector de Medio / Cuenta de Pago */}
      {accountOptions.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">
            ¿Cómo pagaste? (Medio / Cuenta)
          </label>
          <CustomSelect
            className="w-full"
            value={financeAccountId}
            options={accountOptions}
            onChange={setFinanceAccountId}
            placeholder="Seleccionar cuenta o tarjeta"
          />
          {selectedAccount && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {selectedAccount.type === 'CREDIT'
                ? '💳 Suma al gasto mensual y acumula deuda en tu tarjeta (no descuenta banco aún).'
                : '💰 Se descuenta de tus fondos disponibles.'}
            </p>
          )}
        </div>
      )}

      {type !== 'supermarket' && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">Categoría</label>
          <CustomSelect
            className="w-full"
            value={category}
            options={categories}
            onChange={setCategory}
            placeholder="Seleccionar categoría"
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold text-foreground">Notas</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={inputCls}
          placeholder="Opcional"
        />
      </div>

      {type === 'fixed' && (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          Repetir todos los meses
          {isRecurring && (
            <span className="ml-2 flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Día:</span>
              <input
                type="number"
                min={1}
                max={31}
                value={recurrenceDay}
                onChange={(e) => setRecurrenceDay(parseInt(e.target.value))}
                className="w-14 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45"
              />
            </span>
          )}
        </label>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className={`${btnCls} flex-1 bg-primary text-primary-foreground shadow-xs transition hover:bg-primary-hover disabled:opacity-50 font-bold`}
        >
          {submitting ? 'Guardando...' : 'Guardar gasto'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`${btnCls} border border-border bg-surface text-foreground transition hover:bg-surface-soft font-semibold`}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
