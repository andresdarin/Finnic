import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { apiFetch } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** Solo rutas internas: evita usar el callback como redirector abierto. */
function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'
}

/**
 * Retorno de OAuth (Google, Facebook, X): canjea el código por la sesión,
 * asegura el perfil en la API y entra al dashboard.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const destination = new URL(safeNext(params.get('next')), request.url)
  const failure = new URL('/login?error=oauth', request.url)
  const response = NextResponse.redirect(destination)
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')

  const code = params.get('code')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!code || !url || !key || params.get('error')) return NextResponse.redirect(failure)

  try {
    const client = createServerClient(url, key, { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: cookies => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    } })
    const { data, error } = await client.auth.exchangeCodeForSession(code)
    if (error || !data.session) return NextResponse.redirect(failure)

    const meta = data.session.user.user_metadata ?? {}
    const displayName = meta.full_name ?? meta.name ?? meta.user_name
    // Igual que en el login por correo: si falla, el perfil se reintenta más adelante.
    await apiFetch('/api/profiles/ensure', {
      method: 'POST',
      body: JSON.stringify(displayName ? { displayName } : {}),
    }, data.session.access_token).catch(() => undefined)
  } catch {
    return NextResponse.redirect(failure)
  }
  return response
}
