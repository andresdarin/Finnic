'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ApiError } from '@/lib/api'
import { submitExpense } from '../expense-form/submitExpense'
import type { ExpenseForm, ExpenseItemForm } from '../types'

export function useExpenseSubmit({
  form, items, declaredTotal, hasBlockingDifference,
}: {
  form: ExpenseForm
  items: ExpenseItemForm[]
  declaredTotal: number
  hasBlockingDifference: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  /** Devuelve true si el gasto se guardó, para que el formulario se pueda limpiar. */
  const handleSubmit = useCallback(async (): Promise<boolean> => {
    setError(null)
    setSuccess(null)
    setCreatedId(null)
    if (hasBlockingDifference) {
      setError('La diferencia entre el total declarado y los ítems supera $0.05.')
      return false
    }

    setIsSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Tu sesión expiró. Volvé a iniciar sesión.')
      const result = await submitExpense({ token: session.access_token, form, items, declaredTotal })
      setCreatedId(result.id)
      setSuccess('Gasto cargado correctamente.')
      return true
    } catch (err) {
      if (err instanceof ApiError) {
        setError(Array.isArray(err.message) ? err.message.join(', ') : err.message)
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo guardar el gasto.')
      }
    } finally {
      setIsSubmitting(false)
    }
    return false
  }, [form, items, declaredTotal, hasBlockingDifference, supabase])

  const goToMovements = useCallback(() => {
    if (createdId) {
      router.push(`/expenses?highlight=${createdId}`)
    } else {
      router.push('/expenses')
    }
  }, [createdId, router])

  return { isSubmitting, error, success, setError, setSuccess, handleSubmit, createdId, goToMovements }
}
