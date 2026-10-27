import Link from 'next/link'
import FinnicOwlIcon from '@/components/ui/FinnicOwlIcon'
import { LEGAL_LINKS } from '../constants'
import type { LegalKey } from '../types'

/** Marca a la izquierda y selector segmentado entre documentos legales a la derecha. */
export function LegalTopBar({ current }: { current: LegalKey }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Link href="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
        <FinnicOwlIcon color="navy" className="h-9 w-9" />
        <img src="/brand/finnic-logo-navy.png" alt="Finnic" className="h-5 w-auto object-contain" />
      </Link>
      <nav aria-label="Documentos legales" className="flex rounded-full border border-navy/10 bg-white/70 p-1 text-sm backdrop-blur">
        {(Object.keys(LEGAL_LINKS) as LegalKey[]).map(key => (
          <Link
            key={key}
            href={LEGAL_LINKS[key].href}
            aria-current={key === current ? 'page' : undefined}
            className={`inline-flex min-h-10 items-center rounded-full px-4 font-medium transition-colors ${
              key === current ? 'bg-navy text-sand' : 'text-navy/60 hover:text-navy'
            }`}
          >
            {LEGAL_LINKS[key].short}
          </Link>
        ))}
      </nav>
    </div>
  )
}
