'use client'

import type { ComponentType } from 'react'
import type { Provider } from '@supabase/supabase-js'
import { LoaderCircle } from 'lucide-react'
import { FacebookIcon, GoogleIcon, XIcon } from './components/ProviderIcons'
import { useOAuthSignIn } from './hooks'

const PROVIDERS: { id: Provider; label: string; Icon: ComponentType<{ className?: string }> }[] = [
  { id: 'google', label: 'Google', Icon: GoogleIcon },
  { id: 'facebook', label: 'Facebook', Icon: FacebookIcon },
  { id: 'x', label: 'X', Icon: XIcon },
]

/**
 * Separador y fila de accesos sociales (solo iconos), pensada para ir debajo del formulario de correo.
 * `verb` arma la etiqueta accesible: "Continuar con Google", "Registrarte con Google"…
 * `disabled` bloquea la fila, p. ej. hasta aceptar los términos en el registro.
 */
export function SocialAuthButtons({ verb, dividerLabel, disabled = false }: { verb: string; dividerLabel: string; disabled?: boolean }) {
  const { signIn, pending, error } = useOAuthSignIn()

  return (
    <div className="flex flex-col gap-3 md:gap-4 lg:gap-5">
      <div className="flex items-center gap-3 text-xs text-navy/70 dark:text-foreground/40">
        <span className="h-px flex-1 bg-navy/10 dark:bg-white/10" />
        {dividerLabel}
        <span className="h-px flex-1 bg-navy/10 dark:bg-white/10" />
      </div>

      {/* Barra segmentada: misma piel que la tarjeta de campos para leerse como una sola pieza */}
      <div className="flex h-11 md:h-12 lg:h-[52px] divide-x divide-navy/10 overflow-hidden rounded-2xl border border-navy/10 bg-[#F5F2EE]/90 dark:divide-white/10 dark:border-white/10 dark:bg-surface/85">
        {PROVIDERS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => signIn(id)}
            disabled={disabled || pending !== null}
            aria-label={`${verb} con ${label}`}
            title={`${verb} con ${label}`}
            className="group flex flex-1 items-center justify-center text-navy transition-[background-color,scale] duration-200 hover:bg-navy/[0.04] active:scale-[0.97] focus-visible:bg-navy/[0.06] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 dark:text-foreground dark:hover:bg-white/[0.05] dark:focus-visible:bg-white/[0.08]"
          >
            {pending === id
              ? <LoaderCircle className="h-[18px] w-[18px] animate-spin" />
              : <Icon className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110" />}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-2.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
