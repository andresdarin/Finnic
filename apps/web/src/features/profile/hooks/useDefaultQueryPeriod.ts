'use client'

import { useState } from 'react'
import type { DefaultQueryPeriod } from '@lovehold/shared'
import { apiFetch } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/features/auth/ProfileProvider'

export function useDefaultQueryPeriod() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { refreshProfile } = useProfile()

  async function update(defaultQueryPeriod: DefaultQueryPeriod) {
    setSaving(true)
    setError(null)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session?.access_token) throw new Error('No session')
      await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ defaultQueryPeriod }) }, session.access_token)
      await refreshProfile()
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el período')
      return false
    } finally {
      setSaving(false)
    }
  }

  return { saving, error, update }
}
