import { isAdminAppMetadata } from '@lovehold/shared'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Mismo mensaje para credenciales malas y cuentas sin rol: no revela qué cuentas existen. */
export const DENIED = 'No pudimos iniciar sesión con esa cuenta.'
export const EMPTY = 'Completá email y contraseña.'

export const LOGIN_ERRORS: Record<string, string> = { denied: DENIED, empty: EMPTY }

/**
 * Inicia sesión y exige el rol admin. A quien no es admin se le cierra la sesión enseguida
 * para no dejar cookies. Devuelve `null` si entró, o el mensaje de error.
 */
export async function signInAsAdmin(supabase: SupabaseClient, email: string, password: string): Promise<string | null> {
  if (!email.trim() || !password) return EMPTY
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error || !data.user) return DENIED
  if (!isAdminAppMetadata(data.user.app_metadata)) {
    await supabase.auth.signOut()
    return DENIED
  }
  return null
}
