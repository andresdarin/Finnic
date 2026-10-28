/** Rutas accesibles sin sesión de admin. Todo lo demás pasa por el chequeo de rol. */
export const PUBLIC_PATHS = ['/login', '/no-access'] as const

export const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))

/** Decide a dónde va cada request según sesión y rol. `null` = dejar pasar. */
export function resolveAccess(pathname: string, user: { isAdmin: boolean } | null): '/login' | '/no-access' | '/' | null {
  if (!user) return isPublicPath(pathname) ? null : '/login'
  if (!user.isAdmin) return pathname === '/no-access' ? null : '/no-access'
  return isPublicPath(pathname) ? '/' : null
}
