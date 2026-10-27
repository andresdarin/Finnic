'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Mail, LockKeyhole, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'
import { AuthBrand, AuthField, AuthSubmitButton } from '@/features/auth/AuthComponents'
import { SocialAuthButtons } from '@/features/auth/social/SocialAuthButtons'
import { translateAuthError } from '@/features/auth/authErrors'

/**
 * Login de Finnic: encabezado alineado a la izquierda, accesos sociales
 * y formulario monolítico con CTA circular integrado.
 * Si ya hay sesión activa redirige directo al dashboard.
 */
export default function AuthLoginExperience() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted && session) router.replace('/dashboard')
    })
    // /auth/callback vuelve con ?error=oauth si el proveedor social falló o se canceló
    if (new URLSearchParams(window.location.search).get('error') === 'oauth') {
      setError('No pudimos completar el acceso con esa cuenta. Probá de nuevo.')
    }
    return () => {
      isMounted = false
    }
  }, [router, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(translateAuthError(signInError.message))
      setLoading(false)
      return
    }

    const session = data.session

    if (!session) {
      setError('No se pudo obtener la sesión. Revisá tus credenciales.')
      setLoading(false)
      return
    }

    // Sincronizar perfil en background (no bloquea el acceso de la sesión autenticada)
    apiFetch('/api/profiles/ensure', {
      method: 'POST',
      body: JSON.stringify({}),
    }, session.access_token).catch(() => {
      // Background catch silencioso
    })

    router.push('/dashboard')
  }

  const isFormValid = Boolean(email && password)

  return (
    <div className="flex flex-1 flex-col justify-center gap-7 md:gap-12">
      <AuthBrand title="Bienvenido de nuevo" subtitle="Tu copiloto financiero" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative flex items-center justify-between overflow-hidden rounded-2xl border border-navy/10 bg-[#F5F2EE]/90 dark:border-white/10 dark:bg-surface/85">
          <div className="flex flex-1 flex-col divide-y divide-navy/10 dark:divide-white/10">
            <AuthField
              id="email"
              label="Correo electrónico"
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico"
              icon={<Mail className="h-5 w-5 text-accent-ink dark:text-accent stroke-[2.2]" />}
            />

            <AuthField
              id="password"
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              icon={<LockKeyhole className="h-5 w-5 text-navy dark:text-secondary stroke-[2.2]" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="rounded-full p-1 text-teal dark:text-secondary transition-colors hover:text-navy dark:hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  {showPassword ? <EyeOff className="h-4 w-4 stroke-[2]" /> : <Eye className="h-4 w-4 stroke-[2]" />}
                </button>
              }
            />
          </div>

          <div className="flex items-center justify-center p-2.5 pr-3 sm:p-3.5 sm:pr-4">
            <AuthSubmitButton loading={loading} disabled={!isFormValid} ariaLabel="Iniciar sesión en Finnic" />
          </div>
        </div>

        <Link
          href="/forgot-password"
          className="self-end text-xs lg:text-[13px] font-medium text-navy/70 underline-offset-4 transition-colors hover:text-navy hover:underline dark:text-foreground/60 dark:hover:text-foreground"
        >
          ¿Olvidaste tu contraseña?
        </Link>

        {error && (
          <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-2.5 text-xs font-medium text-danger animate-fade-in">
            {error}
          </p>
        )}
      </form>

      <div className="flex flex-col gap-5 md:gap-6">
        <SocialAuthButtons verb="Continuar" dividerLabel="o continuá con" />

        <p className="text-center text-sm text-navy/70 dark:text-foreground/60">
          ¿No tenés cuenta?{' '}
          <Link
            href="/signup"
            className="font-semibold text-accent-ink underline-offset-4 transition-colors hover:text-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  )
}
