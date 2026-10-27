'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch, ApiError } from '@/lib/api'
import type { TranquilityDashboard } from '../types'

export function useTranquility(month: string) {
  const [data, setData] = useState<TranquilityDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloading, setReloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const requestRef = useRef(0)
  const hasDataRef = useRef(false)
  const monthRef = useRef<string | null>(null)
  const load = useCallback(async () => {
    const request = ++requestRef.current
    setLoading(current => current && !hasDataRef.current)
    setReloading(hasDataRef.current)
    setError(null)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) throw new Error('Sesión expirada')
      const next = await apiFetch<TranquilityDashboard>(`/api/finance/tranquility?month=${month}`, {}, session.access_token)
      if (request === requestRef.current) { hasDataRef.current = true; setData(next) }
    } catch (cause) {
      if (request === requestRef.current) setError(cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : 'No pudimos cargar Tranquilidad Financiera.')
    } finally {
      if (request === requestRef.current) { setLoading(false); setReloading(false) }
    }
  }, [month])
  useEffect(() => {
    if (monthRef.current !== null && monthRef.current !== month) {
      hasDataRef.current = false
      setData(null)
      setLoading(true)
    }
    monthRef.current = month
    void load()
  }, [load, month])
  const mutate = useCallback(async <T = unknown>(path: string, method: string, body?: unknown) => {
    setSaving(true)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) throw new Error('Sesión expirada')
      const result = await apiFetch<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) }, session.access_token)
      await load()
      return result
    } catch (cause) {
      const message = cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : 'No pudimos guardar el cambio.'
      setError(message)
      throw cause
    } finally { setSaving(false) }
  }, [load])
  return { data, loading, reloading, error, saving, reload: load, mutate }
}
