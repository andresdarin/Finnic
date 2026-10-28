import 'server-only'
import { requireAdmin } from './auth'

export class AdminApiError extends Error {
  constructor(public status: number) {
    super(`La API respondió ${status}`)
    this.name = 'AdminApiError'
  }
}

/** Llama a la API desde el servidor con el token del admin. El navegador nunca habla con la API. */
export async function adminFetch<T>(path: string): Promise<T> {
  const { accessToken } = await requireAdmin()
  const base = process.env.API_URL ?? 'http://localhost:3001'
  const res = await fetch(`${base}/api/admin${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new AdminApiError(res.status)
  return (await res.json()) as T
}
