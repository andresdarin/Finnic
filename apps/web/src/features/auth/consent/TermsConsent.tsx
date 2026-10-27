'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { LEGAL_LINKS } from '@/features/legal/constants'

const link = 'font-medium text-accent underline-offset-4 transition-colors hover:text-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent'

/**
 * Aceptación obligatoria de términos y privacidad para el registro.
 * Fila suave con la misma piel que los campos; al aceptar se marca con el navy de la marca.
 * Los enlaces abren en otra pestaña para no perder lo que ya se escribió.
 */
export function TermsConsent({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label
      htmlFor="acceptTerms"
      className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-[13px] sm:px-4 sm:py-3 leading-snug lg:px-5 lg:py-3.5 transition-colors ${
        checked
          ? 'border-navy/20 bg-navy/[0.03] text-navy/80 dark:border-aqua/25 dark:bg-aqua/[0.04] dark:text-foreground/85'
          : 'border-navy/10 bg-[#F5F2EE]/60 text-navy/60 hover:border-navy/20 dark:border-white/10 dark:bg-surface/50 dark:text-foreground/60 dark:hover:border-white/20'
      }`}
    >
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          id="acceptTerms"
          name="acceptTerms"
          type="checkbox"
          required
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 cursor-pointer appearance-none rounded-md border border-navy/25 bg-white transition-colors checked:border-navy checked:bg-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-white/25 dark:bg-white/5 dark:checked:border-aqua dark:checked:bg-aqua"
        />
        <Check className="pointer-events-none relative h-3.5 w-3.5 scale-50 stroke-[3] text-sand opacity-0 transition-[scale,opacity] duration-200 peer-checked:scale-100 peer-checked:opacity-100 dark:text-navy" aria-hidden="true" />
      </span>
      <span>
        Acepto los{' '}
        <Link href={LEGAL_LINKS.terms.href} target="_blank" rel="noopener" className={link}>Términos</Link>
        {' '}y la{' '}
        <Link href={LEGAL_LINKS.privacy.href} target="_blank" rel="noopener" className={link}>Política de privacidad</Link>
      </span>
    </label>
  )
}
