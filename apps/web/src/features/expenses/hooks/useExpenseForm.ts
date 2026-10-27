'use client'

import { useCallback, useState } from 'react'
import { parseAmount, sumItems, toCents } from '../constants'
import type { ExpenseForm, ExpenseItemForm } from '../types'
import { useExpenseItems } from './useExpenseItems'
import { useExpenseSubmit } from './useExpenseSubmit'
import { todayLocalISO } from '@/lib/dates'

const ROUNDING_TOLERANCE = 5
const INITIAL_FORM: ExpenseForm = {
  scope: 'personal',
  title: '',
  merchant: '',
  category: 'Compras de súper',
  amount: '',
  date: todayLocalISO(),
  paymentMethod: '',
  notes: '',
}

type ScanData = {
  merchant?: string
  receiptDate?: string
  total?: number
  paymentMethod?: string
  notes?: string
  items?: ExpenseItemForm[]
}

export function useExpenseForm(_profileName: string) {
  const [form, setForm] = useState<ExpenseForm>(INITIAL_FORM)
  const [amountTouched, setAmountTouched] = useState(false)
  const itemState = useExpenseItems({ amountTouched, setForm })

  const itemsTotal = sumItems(itemState.items)
  const declaredTotal = parseAmount(form.amount)
  const difference = itemState.items.length ? declaredTotal - itemsTotal : 0
  const hasBlockingDifference = itemState.items.length > 0 && Math.abs(toCents(difference)) > ROUNDING_TOLERANCE
  const isSupermarketExpense = form.category.toLowerCase().includes('súper') || form.category.toLowerCase().includes('super')
  const canSubmit = !!(form.title.trim() && form.category.trim() && declaredTotal > 0 && form.date && !hasBlockingDifference)
  const submit = useExpenseSubmit({ form, items: itemState.items, declaredTotal, hasBlockingDifference })

  const updateForm = useCallback((field: keyof ExpenseForm, value: string) => {
    if (field === 'amount') setAmountTouched(true)
    setForm((current) => ({ ...current, [field]: value }))
    submit.setSuccess(null)
  }, [submit])

  const useItemsTotalAsAmount = useCallback(() => {
    setAmountTouched(false)
    setForm((current) => ({ ...current, amount: itemsTotal.toFixed(2) }))
  }, [itemsTotal])

  const loadExample = useCallback((example: { form: ExpenseForm; items: ExpenseItemForm[] }) => {
    setAmountTouched(false)
    itemState.setItems(example.items)
    setForm(example.form)
    submit.setError(null)
    submit.setSuccess(null)
  }, [itemState, submit])

  const populateFromScan = useCallback((scanData: ScanData) => {
    const generatedTitle = scanData.merchant ? `Compra en ${scanData.merchant}` : 'Gasto escaneado'
    setAmountTouched(false)
    if (scanData.items) itemState.setItems(scanData.items)
    setForm((current) => ({
      ...current,
      title: current.title || generatedTitle,
      merchant: scanData.merchant ?? current.merchant,
      amount: scanData.total?.toFixed(2) ?? current.amount,
      date: scanData.receiptDate ?? current.date,
      paymentMethod: scanData.paymentMethod ?? current.paymentMethod,
      notes: scanData.notes ? [current.notes, scanData.notes].filter(Boolean).join('\n') : current.notes,
    }))
    submit.setError(null)
    submit.setSuccess(null)
  }, [itemState, submit])

  // Tras guardar se limpia el formulario: evita cargar el mismo gasto dos veces
  const handleSubmit = useCallback(async () => {
    if (!(await submit.handleSubmit())) return
    setAmountTouched(false)
    itemState.setItems([])
    setForm({ ...INITIAL_FORM, date: todayLocalISO() })
  }, [submit, itemState])

  return { form, ...itemState, itemsTotal, declaredTotal, difference, hasBlockingDifference,
    isSupermarketExpense, canSubmit: canSubmit && !submit.isSubmitting, ...submit, handleSubmit,
    updateForm, useItemsTotalAsAmount, loadExample, populateFromScan }
}
