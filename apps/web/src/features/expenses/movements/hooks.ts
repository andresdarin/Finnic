'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'
import { useRefetchOnDataChanged } from '@/hooks/useRefetchOnDataChanged'
import { getCurrentMonth } from './constants'
import type { Movement, MovementFilters, MonthSummary, PaginationInfo, ExpenseListResponse } from './types'

export function useMovements() {
  const [filters, setFiltersState] = useState<MovementFilters>({
    month: getCurrentMonth(), q: '', kind: '', scope: '', category: '', paymentMethod: '', financialType: '', account: '', currency: '', period: '',
  })
  const [movements, setMovements] = useState<Movement[]>([])
  const [summary, setSummary] = useState<MonthSummary | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({ limit: 20, offset: 0, hasMore: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchingRef = useRef(false)

  useEffect(() => {
    load(false)
  }, [filters.month, filters.q, filters.kind, filters.scope, filters.category, filters.paymentMethod, filters.financialType, filters.account, filters.currency, filters.period])

  async function load(append: boolean) {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const token = session?.access_token ?? undefined
      const params = new URLSearchParams()
      params.set('limit', '20')
      params.set('offset', append ? String(movements.length) : '0')
      if (filters.month) params.set('month', filters.month)
      if (filters.q) params.set('q', filters.q)
      if (filters.kind) params.set('kind', filters.kind)
      if (filters.scope) params.set('scope', filters.scope)
      if (filters.category) params.set('category', filters.category)
      if (filters.paymentMethod) params.set('paymentMethod', filters.paymentMethod)
      const data = await apiFetch<ExpenseListResponse>(`/api/expenses?${params}`, {}, token)
      const filtered = data.items.filter((item) => {
        const type = item.financialType ?? 'EXPENSE'
        return (!filters.financialType || type === filters.financialType) &&
          (!filters.currency || item.currency === filters.currency) &&
          (!filters.account || item.accountName === filters.account) &&
          (!filters.period || item.date.slice(0, 10) === filters.period)
      })
      if (append) {
        setMovements(prev => [...prev, ...data.items])
      } else {
        setMovements(filtered)
        setSummary(data.summary)
      }
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar movimientos')
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }

  function setFilter(key: keyof MovementFilters, value: string) {
    setFiltersState(prev => ({ ...prev, [key]: value }))
  }
  function clearFilters() {
    setFiltersState({ month: getCurrentMonth(), q: '', kind: '', scope: '', category: '', paymentMethod: '', financialType: '', account: '', currency: '', period: '' })
  }
  function refresh() { load(false) }
  useRefetchOnDataChanged(refresh)
  function loadMore() { if (!loading && pagination.hasMore) load(true) }

  return { movements, summary, pagination, loading, error, filters, setFilter, clearFilters, refresh, loadMore }
}
