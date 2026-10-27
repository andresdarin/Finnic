import Link from 'next/link'
import { KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { FINNIC_PRIVACY } from '@lovehold/shared'
import { LEGAL_LINKS } from '@/features/legal/constants'

// Solo afirmaciones verificables: TLS en el servicio publicado, hash bcrypt de Supabase Auth
// y la política de no vender datos (ver Política de privacidad).
const TRUST = [
  { Icon: LockKeyhole, label: 'Conexión cifrada con TLS', short: 'Cifrado TLS' },
  { Icon: KeyRound, label: 'Contraseñas protegidas con hash bcrypt', short: 'Hash bcrypt' },
  { Icon: ShieldCheck, label: 'Nunca vendemos tus datos', short: 'Sin venta de datos' },
]

const link = 'underline-offset-4 transition-colors hover:text-navy hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent dark:hover:text-foreground'

/** Sello de seguridad y enlaces legales debajo del marco de autenticación. */
export function AuthLegalFooter() {
  return (
    <footer className="mx-auto mt-4 flex w-full max-w-[1260px] flex-col items-center gap-2 px-2 text-center text-[11px] sm:mt-6 sm:gap-3 sm:text-xs text-navy/50 dark:text-foreground/45">
      <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:gap-x-5 sm:gap-y-2">
        {TRUST.map(({ Icon, label, short }) => (
          <li key={label} className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-teal dark:text-aqua/70" aria-hidden="true" />
            {/* En mobile la versión corta mantiene los tres sellos en una línea */}
            <span className="sm:hidden" aria-hidden="true">{short}</span>
            <span className="sr-only sm:not-sr-only">{label}</span>
          </li>
        ))}
      </ul>
      <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <span>© {new Date().getFullYear()} Finnic</span>
        <span aria-hidden="true">·</span>
        <Link href={LEGAL_LINKS.terms.href} className={link}>{LEGAL_LINKS.terms.label}</Link>
        <span aria-hidden="true">·</span>
        <Link href={LEGAL_LINKS.privacy.href} className={link}>{LEGAL_LINKS.privacy.label}</Link>
        <span aria-hidden="true">·</span>
        <a href={`mailto:${FINNIC_PRIVACY.email}`} className={link}>Contacto</a>
      </nav>
    </footer>
  )
}
