import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { isAdminAppMetadata } from '@lovehold/shared'
import { createClient } from './supabase/server'

/**
 * Segunda verificación (la primera es `proxy.ts`): valida el usuario contra Supabase Auth
 * con `getUser()` y exige el rol admin en `app_metadata`. Devuelve el token para la API.
 */
export const requireAdmin = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isAdminAppMetadata(user.app_metadata)) redirect('/no-access')

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  return { email: user.email ?? '', accessToken: session.access_token }
})
