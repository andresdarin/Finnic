/** Normaliza `?page=&q=` de la URL antes de pasarlos a la API (que vuelve a validarlos). */
export function parseUsersQuery(params: { page?: string | string[]; q?: string | string[] }) {
  const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v)
  const page = Math.max(1, Math.min(10_000, Number.parseInt(first(params.page) ?? '1', 10) || 1))
  const q = (first(params.q) ?? '').trim().slice(0, 100)
  return { page, q }
}

export function usersHref(page: number, q: string) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? `/users?${query}` : '/users'
}
