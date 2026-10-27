'use client'

import React, { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { Mail, LockKeyhole, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'
import FinnicOwlIcon from '@/components/ui/FinnicOwlIcon'
import { AuthField, AuthSubmitButton } from '@/features/auth/AuthComponents'

const INTRO_STORAGE_KEY = 'finnic_auth_intro_seen'

/**
 * Experiencia de Login con micro intro animation (~950ms).
 *
 * Secuencia:
 * 1. 0ms: Solo el isotipo del búho centrado en pantalla (opacity 0->1, scale .92->1, translateY 12->0, blur 6->0).
 * 2. ~300ms: Revelación del wordmark "Finnic" desde abajo.
 * 3. ~650ms: Desplazamiento suave del branding hacia su posición superior definitiva.
 * 4. ~800ms: Aparición progresiva (stagger) del subtítulo, formulario monolítico ligero y footer.
 * 5. ~950ms: UI 100% disponible e interactiva.
 *
 * Sin bloquear auth, networking, autofill ni hidratación.
 * Si reduced-motion está activo o el usuario ya vio la intro recientemente en la sesión, entra directo.
 */
export default function AuthLoginExperience() {
  const router = useRouter()
  const supabase = createClient()
  const shouldReduceMotion = useReducedMotion()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Determinar si corre la animación o entra directo
  const [skipIntro, setSkipIntro] = useState<boolean>(true)
  const [animationPhase, setAnimationPhase] = useState<'initial' | 'revealed' | 'settled'>('settled')

  useEffect(() => {
    // 1. Verificación rápida de sesión activa: si ya hay sesión, no reproducir intro
    let isMounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return
      if (session) {
        router.replace('/dashboard')
        return
      }

      // Si prefiere reduced-motion o ya vio la intro en esta sesión
      const alreadySeen = sessionStorage.getItem(INTRO_STORAGE_KEY)
      if (shouldReduceMotion || alreadySeen) {
        setSkipIntro(true)
        setAnimationPhase('settled')
        return
      }

      // Iniciar micro-secuencia (total ~950ms)
      sessionStorage.setItem(INTRO_STORAGE_KEY, '1')
      setSkipIntro(false)
      setAnimationPhase('initial')

      // Fase 2: Revelar wordmark a los 280ms
      const t1 = setTimeout(() => {
        if (isMounted) setAnimationPhase('revealed')
      }, 280)

      // Fase 3: Desplazar branding y desplegar formulario a los 620ms
      const t2 = setTimeout(() => {
        if (isMounted) setAnimationPhase('settled')
      }, 620)

      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    })

    return () => {
      isMounted = false
    }
  }, [router, supabase, shouldReduceMotion])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
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
  const isSettled = skipIntro || animationPhase === 'settled'

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {/* 1. Header con Búho y Wordmark */}
      <motion.header
        className="flex flex-col items-center text-center select-none z-20"
        initial={false}
        animate={
          skipIntro
            ? { y: 0, scale: 1 }
            : animationPhase === 'settled'
            ? { y: 0, scale: 1 }
            : {
                y: 'min(14vh, 120px)',
                scale: 1.08,
              }
        }
        transition={{
          duration: 0.55,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {/* Búho con aparición inicial suave */}
        <motion.div
          initial={
            skipIntro
              ? { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }
              : { opacity: 0, scale: 0.92, y: 12, filter: 'blur(6px)' }
          }
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            filter: 'blur(0px)',
          }}
          transition={{
            duration: 0.45,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="mb-3 flex items-center justify-center"
        >
          <div className="dark:hidden transition-transform duration-300 hover:scale-105">
            <FinnicOwlIcon color="navy" className="h-16 w-16 sm:h-20 sm:w-20 drop-shadow-xs" />
          </div>
          <div className="hidden transition-transform duration-300 hover:scale-105 dark:block">
            <FinnicOwlIcon color="aqua" className="h-16 w-16 sm:h-20 sm:w-20 drop-shadow-xs" />
          </div>
        </motion.div>

        {/* Wordmark "Finnic" revelado con fade/mask/translate */}
        <div className="overflow-hidden mb-1 flex items-center justify-center h-8 sm:h-9">
          <motion.div
            initial={
              skipIntro
                ? { y: 0, opacity: 1 }
                : { y: 18, opacity: 0 }
            }
            animate={
              skipIntro || animationPhase !== 'initial'
                ? { y: 0, opacity: 1 }
                : { y: 18, opacity: 0 }
            }
            transition={{
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <img
              src="/brand/finnic-logo-navy.png"
              alt="Finnic"
              className="h-7 w-auto object-contain sm:h-8 dark:hidden"
            />
            <img
              src="/brand/finnic-logo-cream.png"
              alt="Finnic"
              className="hidden h-7 w-auto object-contain sm:h-8 dark:block"
            />
          </motion.div>
        </div>

        {/* Subtítulo / Tagline sutil */}
        <motion.p
          initial={skipIntro ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
          animate={
            isSettled
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 6 }
          }
          transition={{
            duration: 0.35,
            delay: skipIntro ? 0 : 0.05,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="mt-0.5 text-xs font-medium tracking-wide text-navy/70 sm:text-sm dark:text-text-secondary"
        >
          Tu copiloto financiero
        </motion.p>
      </motion.header>

      {/* 2. Bloque Formulario y Footer desplegados progresivamente */}
      <motion.div
        initial={skipIntro ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        animate={
          isSettled
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 14 }
        }
        transition={{
          duration: 0.45,
          delay: skipIntro ? 0 : 0.08,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="mt-6 sm:mt-8 w-full flex flex-col gap-4"
      >
        {/* Formulario monolítico en cristal cálido súper limpio */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="relative flex items-center justify-between overflow-hidden rounded-2xl border border-navy/10 dark:border-white/10 bg-[#F5F2EE]/90 dark:bg-surface/85 shadow-lg shadow-navy/[0.03] dark:shadow-black/25 backdrop-blur-md transition-all">
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
                icon={<Mail className="h-5 w-5 text-accent dark:text-accent stroke-[2.2]" />}
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
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 stroke-[2]" />
                    ) : (
                      <Eye className="h-4 w-4 stroke-[2]" />
                    )}
                  </button>
                }
              />
            </div>

            {/* CTA Circular Sólido Integrado a la derecha */}
            <div className="p-3 sm:p-3.5 pr-4 flex items-center justify-center">
              <AuthSubmitButton
                loading={loading}
                disabled={!isFormValid}
                ariaLabel="Iniciar sesión en Finnic"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-2.5 text-xs font-medium text-danger animate-fade-in backdrop-blur-xs">
              {error}
            </p>
          )}
        </form>

        {/* Enlaces de pie y navegación */}
        <footer className="mt-1 flex flex-col items-center">
          <Link href="/forgot-password" className="mb-2 inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline">¿Olvidaste tu contraseña?</Link>
          <p className="text-center text-xs sm:text-sm font-medium text-navy/75 dark:text-foreground/75">
            ¿No tenés cuenta?{' '}
            <Link
              href="/signup"
              className="font-bold text-accent hover:text-accent-hover transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              Crear cuenta
            </Link>
          </p>
        </footer>
      </motion.div>
    </div>
  )
}
