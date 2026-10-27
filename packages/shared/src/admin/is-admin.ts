/**
 * Regla única de "quién es admin", compartida por la API y el panel.
 * Solo `app_metadata` cuenta: Supabase lo escribe únicamente con la service role.
 * Nunca pasar `user_metadata`, que el propio usuario puede editar.
 */
export function isAdminAppMetadata(appMetadata: unknown): boolean {
  if (!appMetadata || typeof appMetadata !== 'object') return false
  const claims = appMetadata as Record<string, unknown>
  const role = typeof claims.role === 'string' ? claims.role.toLowerCase() : null
  return role === 'admin' || claims.admin === true
}
