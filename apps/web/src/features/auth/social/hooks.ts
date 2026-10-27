'use client'

import { useState } from 'react'
import type { Provider } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

/**
 * Inicia el flujo OAuth de Supabase. El navegador sale hacia el proveedor y
 * vuelve a /auth/callback, que canjea el código por la sesión.
 */
export function useOAuthSignIn() {
  const [pending, setPending] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function signIn(provider: Provider) {
    setError(null)
    setPending(provider)
    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    // Si no hubo error el navegador ya está redirigiendo; solo limpiamos al fallar.
    if (oauthError) {
      setError('No pudimos conectar con ese proveedor. Probá de nuevo o usá tu correo.')
      setPending(null)
    }
  }

  return { signIn, pending, error }
}
