import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'
export async function chatRequest<T>(path: string, body?: unknown): Promise<T> {
  const { data: { session } } = await createClient().auth.getSession()
  if (!session) throw new Error('Session unavailable')
  return apiFetch<T>(path, body === undefined ? {} : { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }, session.access_token)
}

