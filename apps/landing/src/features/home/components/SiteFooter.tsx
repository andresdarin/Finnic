import Image from 'next/image'
import Link from 'next/link'
import { FINNIC_PRIVACY } from '@lovehold/shared'
import { LOGIN_URL } from '@/lib/site'

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Image src="/brand/finnic-symbol-navy.png" alt="" width={28} height={28} />
          <p>© {new Date().getFullYear()} Finnic · Hecho en Uruguay</p>
        </div>
        <nav aria-label="Legal y cuenta" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-ink">Privacidad</Link>
          <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-ink">Términos</Link>
          <a href={`mailto:${FINNIC_PRIVACY.email}`} className="inline-flex min-h-11 items-center hover:text-ink">Contacto</a>
          <a href={LOGIN_URL} className="inline-flex min-h-11 items-center hover:text-ink">Ingresar</a>
        </nav>
      </div>
    </footer>
  )
}
