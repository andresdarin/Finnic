'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'
import type { WhatsAppAccountOption, WhatsAppLinkCode, WhatsAppLinkStatus } from '../types'

async function call<T>(path: string, init: RequestInit = {}) {
  const { data: { session } } = await createClient().auth.getSession()
  if (!session?.access_token) throw new Error('Sesión expirada')
  return apiFetch<T>(path, init, session.access_token)
}

export function useWhatsAppLink() {
  const [status, setStatus] = useState<WhatsAppLinkStatus | null>(null)
  const [accounts, setAccounts] = useState<WhatsAppAccountOption[]>([])
  const [code, setCode] = useState<WhatsAppLinkCode | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try { await work() } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos completar la acción.') } finally { setBusy(false) }
  }, [])

  const refresh = useCallback(() => run(async () => {
    const [next, list] = await Promise.all([call<WhatsAppLinkStatus>('/api/me/whatsapp'), call<WhatsAppAccountOption[]>('/api/finance/accounts')])
    setStatus(next)
    setAccounts(list.filter(account => (account.purpose ?? 'OPERATING') === 'OPERATING'))
    if (next.linked) setCode(null)
  }), [run])

  useEffect(() => { void refresh() }, [refresh])

  const generate = () => run(async () => setCode(await call<WhatsAppLinkCode>('/api/me/whatsapp/link-code', { method: 'POST' })))
  const unlink = () => run(async () => { setStatus(await call<WhatsAppLinkStatus>('/api/me/whatsapp', { method: 'DELETE' })); setCode(null) })
  const saveDefaults = (body: { defaultAccountId?: string | null; defaultCurrency?: string | null }) =>
    run(async () => setStatus(await call<WhatsAppLinkStatus>('/api/me/whatsapp/defaults', { method: 'PATCH', body: JSON.stringify(body) })))

  return { status, accounts, code, busy, error, refresh, generate, unlink, saveDefaults }
}
