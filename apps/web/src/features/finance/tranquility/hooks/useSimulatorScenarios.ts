'use client'

import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import type { SavedSimulatorScenario } from '../simulatorTypes'

const money = z.string().regex(/^\d+\.\d{2}$/)
const scenarioSchema = z.object({ id: z.string().min(1), name: z.string().min(1).max(80), initialCapital: money, monthlyContribution: money, annualReturnPct: z.number().finite().gt(-100).lte(100000), annualInflationPct: z.number().finite().gt(-100).lte(100000), years: z.number().int().min(0).max(100), contributionGrowthPct: z.number().finite().gt(-100).lte(100000), targetCapital: money }).strict()

async function authorized<T>(path: string, options?: RequestInit) {
  const { data: { session } } = await createClient().auth.getSession()
  if (!session?.access_token) throw new Error('Tu sesión expiró. Volvé a iniciar sesión.')
  return apiFetch<T>(path, options, session.access_token)
}

export function useSimulatorScenarios() {
  const [scenarios, setScenarios] = useState<SavedSimulatorScenario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const parsed = z.array(scenarioSchema).safeParse(await authorized<unknown>('/finance/tranquility/scenarios'))
      if (!parsed.success) throw new Error('El servidor devolvió escenarios inválidos.')
      setScenarios(parsed.data)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos cargar tus escenarios.') } finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  const remove = async (id: string) => { setError(null); try { await authorized(`/finance/tranquility/scenarios/${encodeURIComponent(id)}`, { method: 'DELETE' }); await refresh() } catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos borrar el escenario.') } }
  return { scenarios, loading, error, refresh, remove }
}
