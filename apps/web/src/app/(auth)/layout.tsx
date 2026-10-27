import React from 'react'
import { ThemeProvider } from '@/features/theme/ThemeProvider'
import { AuthBackground } from '@/features/auth/AuthBackground'
import { AuthSplitShell } from '@/features/auth/split-shell/AuthSplitShell'
import ThemeToggle from '@/features/shell/ThemeToggle'

/**
 * Layout unificado para autenticación en Finnic.
 * Fondo de plumas + marco en dos columnas (formulario y panel promocional),
 * con soporte para safe areas, 100dvh y selector de tema arriba a la derecha.
 * En mobile se reserva espacio superior para que el selector no tape el marco.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <div className="relative flex min-h-[100dvh] w-full flex-col justify-between overflow-x-hidden bg-background text-foreground selection:bg-accent/30">
        <AuthBackground />

        <div className="absolute top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] right-[max(1rem,calc(env(safe-area-inset-right)+1rem))] z-20">
          <ThemeToggle variant="auth" />
        </div>

        <main className="relative z-10 flex min-h-[100dvh] w-full flex-col justify-center px-[max(1rem,calc(env(safe-area-inset-left)+1rem))] py-6 sm:px-6 sm:py-10 md:py-14 pt-[max(3.75rem,calc(env(safe-area-inset-top)+3.25rem))] md:pt-[max(1.5rem,calc(env(safe-area-inset-top)+1rem))] pr-[max(1rem,calc(env(safe-area-inset-right)+1rem))] pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.75rem))] md:pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))]">
          <AuthSplitShell>{children}</AuthSplitShell>
        </main>
      </div>
    </ThemeProvider>
  )
}
