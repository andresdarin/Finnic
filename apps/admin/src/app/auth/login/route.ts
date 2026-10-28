import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EMPTY, signInAsAdmin } from '@/features/auth/sign-in'

/**
 * Login por POST de formulario común (no Server Action): el chequeo de Origin de los
 * Server Actions falla detrás de proxies que mandan `Origin: null`. La sesión queda en
 * cookies del servidor; el rol se vuelve a exigir en `proxy.ts`, el layout y la API.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData()
  const failure = await signInAsAdmin(await createClient(), String(form.get('email') ?? ''), String(form.get('password') ?? ''))
  const target = failure ? `/login?error=${failure === EMPTY ? 'empty' : 'denied'}` : '/'
  return NextResponse.redirect(new URL(target, request.url), 303)
}
