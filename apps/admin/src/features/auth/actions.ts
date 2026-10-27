'use server'

import { redirect } from 'next/navigation'
import { isAdminAppMetadata } from '@lovehold/shared'
import { createClient } from '@/lib/supabase/server'

export type SignInState = { error: string | null }

/** Mismo mensaje para credenciales malas y cuentas sin rol: no revela qué cuentas existen. */
const DENIED = 'No pudimos iniciar sesión con esa cuenta.'

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return { error: 'Completá email y contraseña.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) return { error: DENIED }

  if (!isAdminAppMetadata(data.user.app_metadata)) {
    await supabase.auth.signOut()
    return { error: DENIED }
  }
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
