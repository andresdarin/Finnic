import Image from 'next/image'
import Link from 'next/link'
import { LOGIN_URL, SIGNUP_URL } from '@/lib/site'
import { NAV } from '../constants'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-sand/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Finnic, inicio" className="shrink-0">
          <Image src="/brand/finnic-logo-navy.png" alt="Finnic" width={92} height={36} priority />
        </Link>
        <nav aria-label="Secciones" className="hidden flex-1 justify-center gap-7 text-sm text-ink-soft lg:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="transition-colors duration-150 hover:text-ink">{item.label}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a href={LOGIN_URL} className="hidden h-11 items-center rounded-full px-4 text-sm font-medium text-ink transition-colors duration-150 hover:bg-sand-strong sm:inline-flex">
            Ingresar
          </a>
          <a href={SIGNUP_URL} className="inline-flex h-11 items-center rounded-full bg-navy px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-navy-deep">
            Crear cuenta
          </a>
        </div>
      </div>
    </header>
  )
}
