'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, LockKeyhole, UserRound, Phone, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'
import { AuthBrand, AuthField, AuthSubmitButton } from '@/features/auth/AuthComponents'
import { SocialAuthButtons } from '@/features/auth/social/SocialAuthButtons'
import { TermsConsent } from '@/features/auth/consent/TermsConsent'
import { translateAuthError } from '@/features/auth/authErrors'
import { TERMS_VERSION } from '@/features/legal/constants'

/**
 * Vista de Register rediseñada para Finnic.
 * Formulario monolítico en cristal cálido con los campos ordenados:
 * 1. Nombre completo
 * 2. Correo electrónico
 * 3. Teléfono (opcional)
 * 4. Contraseña y Repetir contraseña con el botón CTA circular a la derecha en el medio de ambos.
 */
export default function SignUpPage() {
  const router = useRouter()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailConfirmMessage, setEmailConfirmMessage] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEmailConfirmMessage(null)

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          phone,
          terms_version: TERMS_VERSION,
          terms_accepted_at: new Date().toISOString(),
        },
      },
    })

    if (signUpError) {
      setError(translateAuthError(signUpError.message))
      setLoading(false)
      return
    }

    const session = data.session

    if (!session) {
      setEmailConfirmMessage('Revisá tu email para confirmar la cuenta antes de iniciar sesión.')
      setLoading(false)
      return
    }

    try {
      await apiFetch('/api/profiles/ensure', {
        method: 'POST',
        body: JSON.stringify({ displayName }),
      }, session.access_token)

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el perfil')
      setLoading(false)
    }
  }

  if (!mounted) return null

  const isFormValid = Boolean(displayName && email && password && confirmPassword && acceptedTerms)

  return (
    <div className="flex flex-1 flex-col justify-between gap-6 md:gap-10">
      <AuthBrand
        title="Creá tu cuenta"
        subtitle="Empezá a ordenar tus finanzas."
      />

      {/* Formulario monolítico en bloque de cristal cálido (Sand/Navy) */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-2xl border border-navy/10 bg-[#F5F2EE]/90 dark:border-white/10 dark:bg-surface/85">
          <div className="flex flex-col divide-y divide-navy/10 dark:divide-white/10">
            {/* 1. Nombre completo */}
            <AuthField
              id="displayName"
              label="Nombre completo"
              type="text"
              required
              autoFocus
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nombre completo"
              icon={<UserRound className="h-5 w-5 text-navy dark:text-foreground stroke-[2.2]" />}
            />

            {/* 2. Correo electrónico */}
            <AuthField
              id="email"
              label="Correo electrónico"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico"
              icon={<Mail className="h-5 w-5 text-accent-ink dark:text-accent stroke-[2.2]" />}
            />

            {/* 3. Teléfono (opcional) */}
            <AuthField
              id="phone"
              label="Teléfono (opcional)"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Teléfono (opcional)"
              icon={<Phone className="h-5 w-5 text-teal dark:text-secondary stroke-[2.2]" />}
            />

            {/* 4 & 5. Contraseña y Repetir Contraseña con el Botón CTA a la derecha en el medio */}
            <div className="relative flex items-center justify-between">
              <div className="flex flex-1 flex-col divide-y divide-navy/10 dark:divide-white/10">
                <AuthField
                  id="password"
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  minLength={6}
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

                <AuthField
                  id="confirmPassword"
                  label="Repetir contraseña"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetir contraseña"
                  icon={<LockKeyhole className="h-5 w-5 text-navy dark:text-secondary stroke-[2.2]" />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="rounded-full p-1 text-teal dark:text-secondary transition-colors hover:text-navy dark:hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4 stroke-[2]" /> : <Eye className="h-4 w-4 stroke-[2]" />}
                    </button>
                  }
                />
              </div>

              {/* CTA Circular Sólido Integrado a la derecha entre las dos contraseñas */}
              <div className="flex items-center justify-center p-2.5 pr-3 sm:p-3.5 sm:pr-4">
                <AuthSubmitButton
                  loading={loading}
                  disabled={!isFormValid}
                  ariaLabel="Crear cuenta en Finnic"
                />
              </div>
            </div>
          </div>
        </div>

        <TermsConsent checked={acceptedTerms} onChange={setAcceptedTerms} />

        {error && (
          <p role="alert" className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-xs font-medium text-danger animate-fade-in backdrop-blur-xs">
            {error}
          </p>
        )}

        {emailConfirmMessage && (
          <p className="rounded-2xl border border-accent/30 bg-surface-soft/80 px-4 py-3 text-xs text-foreground backdrop-blur-xs">
            {emailConfirmMessage}
          </p>
        )}
      </form>

      <div className="flex flex-col gap-4 md:gap-6">
        <SocialAuthButtons verb="Registrarte" dividerLabel="o registrate con" disabled={!acceptedTerms} />

        <p className="text-center text-sm text-navy/70 dark:text-foreground/60">
          ¿Ya tenés cuenta?{' '}
          <Link
            href="/login"
            className="font-semibold text-accent-ink underline-offset-4 transition-colors hover:text-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
