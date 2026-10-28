'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'
import { emitDataChanged } from '@/lib/dataChanged'
import { useRefetchOnDataChanged } from '@/hooks/useRefetchOnDataChanged'
import { currentMonthKey } from './constants'
import type {
  PersonalExpense,
  FinanceAccount,
  CreateTransferData,
  RegisterIncomeData,
} from './types'

export function usePersonalFinance(monthKey?: string) {
  const key = monthKey ?? currentMonthKey()
  const [expenses, setExpenses] = useState<PersonalExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')
      const data = await apiFetch<PersonalExpense[]>(
        `/api/personal-finance?monthKey=${key}`,
        {},
        session.access_token,
      )
      setExpenses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar gastos')
    } finally {
      setLoading(false)
    }
  }, [key])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])
  useRefetchOnDataChanged(fetchExpenses)

  return { expenses, loading, error, refetch: fetchExpenses }
}

export function useFinanceAccounts() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')
      const data = await apiFetch<FinanceAccount[]>(
        '/api/finance/accounts',
        {},
        session.access_token,
      )
      setAccounts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar cuentas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])
  useRefetchOnDataChanged(fetchAccounts)

  return { accounts, loading, error, refetch: fetchAccounts }
}

export interface FinanceSnapshot {
  asOf?: string
  baseCurrency?: 'UYU' | 'USD'
  balances?: {
    spendableByCurrency?: Partial<Record<'UYU' | 'USD', string | number>>
    creditDebtByCurrency?: Partial<Record<'UYU' | 'USD', string | number>>
    spendableInBase?: { currency?: string; amount?: string | number } | null
  }
  spendableByCurrency?: Partial<Record<'UYU' | 'USD', string | number>>
  creditDebtByCurrency?: Partial<Record<'UYU' | 'USD', string | number>>
  spendableInBase?: { currency?: string; amount?: string | number } | null
}

export function useFinanceSnapshot() {
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSnapshot = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) throw new Error('No session')
      setSnapshot(await apiFetch<FinanceSnapshot>('/api/finance/snapshot', {}, session.access_token))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el balance')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSnapshot() }, [fetchSnapshot])
  useRefetchOnDataChanged(fetchSnapshot)
  return { snapshot, loading, error, refetch: fetchSnapshot }
}

export function useCreateExpense() {
  const [submitting, setSubmitting] = useState(false)

  const create = useCallback(async (data: unknown) => {
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')
      const result = await apiFetch<PersonalExpense>(
        '/api/personal-finance',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        session.access_token,
      )
      emitDataChanged()
      return result
    } finally {
      setSubmitting(false)
    }
  }, [])

  return { create, submitting }
}

export function useCreateTransfer() {
  const [submitting, setSubmitting] = useState(false)

  const transfer = useCallback(async (data: CreateTransferData) => {
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')
      const result = await apiFetch<PersonalExpense>(
        '/api/finance/transfers',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        session.access_token,
      )
      emitDataChanged()
      return result
    } finally {
      setSubmitting(false)
    }
  }, [])

  return { transfer, submitting }
}

export function useRegisterIncome() {
  const [submitting, setSubmitting] = useState(false)

  const income = useCallback(async (data: RegisterIncomeData) => {
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')
      const result = await apiFetch<any>(
        '/api/finance/incomes',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        session.access_token,
      )
      emitDataChanged()
      return result
    } finally {
      setSubmitting(false)
    }
  }, [])

  return { income, submitting }
}
