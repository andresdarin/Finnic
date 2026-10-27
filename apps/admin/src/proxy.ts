import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isAdminAppMetadata } from '@lovehold/shared'
import { supabaseEnv } from './lib/supabase/env'
import { resolveAccess } from './lib/routes'

/**
 * Primera barrera del panel: corre antes de cada página. Refresca la sesión,
 * la valida contra Supabase Auth (`getUser`, no el JWT sin verificar) y exige el rol admin.
 * Una sesión válida sin rol se cierra para no dejar cookies de la app en este dominio.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { url, key } = supabaseEnv()
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user ? isAdminAppMetadata(user.app_metadata) : false
  if (user && !isAdmin) await supabase.auth.signOut()

  const target = resolveAccess(request.nextUrl.pathname, user ? { isAdmin } : null)
  if (!target) return response

  const redirect = NextResponse.redirect(new URL(target, request.url))
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  return redirect
}

export const config = {
  // /auth/* son los POST de login y logout: validan credenciales y rol por su cuenta.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|icon.png|auth/).*)'],
}
