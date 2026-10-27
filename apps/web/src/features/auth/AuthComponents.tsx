'use client'

import React from 'react'
import { LoaderCircle, ArrowRight } from 'lucide-react'
import FinnicOwlIcon from '@/components/ui/FinnicOwlIcon'

export interface AuthBrandProps {
  title?: string
  subtitle?: string
  tagline?: string
  hideHeaderOnIntro?: boolean
  showOwl?: boolean
  className?: string
}

/**
 * Encabezado de marca para autenticación Finnic, centrado: búho arriba como sello,
 * título protagonista y subtítulo de apoyo opcional.
 * El wordmark no se repite: el panel promocional lo muestra en todos los tamaños.
 */
export function AuthBrand({
  title,
  subtitle = 'Tu copiloto financiero',
  tagline,
  showOwl = true,
  className = '',
}: AuthBrandProps) {
  return (
    <header className={`flex flex-col items-center text-center select-none ${className}`}>
      {showOwl && (
        <div className="mb-3 flex w-full items-center justify-center gap-3 sm:mb-4 lg:mb-5">
          <FinnicOwlIcon color="navy" className="h-12 w-12 sm:h-14 sm:w-14 lg:h-[72px] lg:w-[72px] dark:hidden" />
          <FinnicOwlIcon color="aqua" className="hidden h-12 w-12 sm:h-14 sm:w-14 lg:h-[72px] lg:w-[72px] dark:block" />
        </div>
      )}

      {title && (
        <h1 className="type-display text-balance text-[1.75rem] leading-[1.1] sm:text-[2rem] lg:text-[2.35rem] text-navy dark:text-foreground">
          {title}
        </h1>
      )}

      {subtitle && (
        <p className="mt-1 text-pretty text-[13px] sm:mt-1.5 sm:text-sm lg:mt-2 lg:text-[15px] text-navy/60 dark:text-text-secondary">
          {subtitle}
        </p>
      )}

      {tagline && (
        <p className="mt-1 text-[11px] text-text-secondary">
          {tagline}
        </p>
      )}
    </header>
  )
}

export interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  icon: React.ReactNode
  rightElement?: React.ReactNode
}

/**
 * Campo de input ultra-minimalista.
 * Cero recuadros, bordes invasivos o saltos de layout al interactuar.
 */
export function AuthField({
  id,
  label,
  icon,
  rightElement,
  className = '',
  ...props
}: AuthFieldProps) {
  return (
    <div className="group relative flex flex-col justify-center px-3 py-3 sm:px-5 sm:py-4 lg:px-5 lg:py-[18px]">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        <span className="shrink-0 transition-opacity group-focus-within:opacity-100 opacity-80">
          {icon}
        </span>
        <input
          id={id}
          style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
          className={`auth-input w-full border-0 bg-transparent text-base font-medium text-navy placeholder:text-navy/40 outline-none ring-0 shadow-none focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none active:outline-none active:ring-0 selection:bg-transparent dark:text-foreground dark:placeholder:text-muted-foreground/45 ${className}`}
          {...props}
        />
        {rightElement && <div className="flex shrink-0 items-center">{rightElement}</div>}
      </div>
    </div>
  )
}

/**
 * Botón circular insignia de avance con flecha.
 * Mantiene micro-interacciones pulidas de hover y press con feedback háptico visual.
 */
export function AuthSubmitButton({
  loading,
  disabled,
  ariaLabel,
  className = '',
}: {
  loading?: boolean
  disabled?: boolean
  ariaLabel: string
  className?: string
}) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      aria-label={ariaLabel}
      className={`group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-navy/15 bg-navy text-sand transition-[background-color,scale,opacity] duration-200 hover:scale-105 hover:bg-primary-hover active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-35 sm:h-14 sm:w-14 lg:h-[60px] lg:w-[60px] dark:border-aqua/20 dark:bg-aqua dark:text-navy dark:hover:bg-aqua/90 ${className}`}
    >
      {loading ? (
        <LoaderCircle className="h-5 w-5 animate-spin stroke-[2.4]" />
      ) : (
        <ArrowRight className="h-5 w-5 stroke-[2.4] transition-transform duration-200 group-hover:translate-x-0.5" />
      )}
    </button>
  )
}
