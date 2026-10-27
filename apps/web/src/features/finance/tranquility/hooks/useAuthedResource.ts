'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch, ApiError } from '@/lib/api'

export async function authedFetch<T>(path: string, method = 'GET', body?: unknown) {
  const { data: { session } } = await createClient().auth.getSession()
  if (!session) throw new Error('Sesión expirada')
  return apiFetch<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) }, session.access_token)
}

/** Loads one authenticated resource and exposes a mutation that reloads it. */
export function useAuthedResource<T>(path: string, onChanged?: () => Promise<unknown> | void) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    try { setData(await authedFetch<T>(path)); setError(null) } catch (cause) { setError(cause instanceof ApiError || cause instanceof Error ? cause.message : 'No pudimos cargar los datos.') }
  }, [path])
  useEffect(() => { void load() }, [load])
  const mutate = useCallback(async (target: string, method: string, body?: unknown) => {
    setBusy(true)
    try { await authedFetch(target, method, body); setError(null); await Promise.all([load(), onChanged?.()]); return true }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar el cambio.'); return false }
    finally { setBusy(false) }
  }, [load, onChanged])
  return { data, error, busy, reload: load, mutate }
}
