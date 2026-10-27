import Link from 'next/link'
import { ChevronRight, Sprout } from 'lucide-react'

/** Acceso a Tranquilidad financiera: vive dentro de Balance, no en el menú principal. */
export default function BalanceTranquilityLink() {
  return (
    <Link
      href="/tranquilidad-financiera"
      className="group neu-raised flex items-center gap-4 rounded-3xl bg-surface/60 p-5 transition-[background-color,scale] duration-200 hover:bg-surface active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:p-6"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/15">
        <Sprout className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-foreground">Tranquilidad financiera</span>
        <span className="mt-0.5 block text-pretty text-xs text-muted-foreground">Tu plan para gastar, ahorrar e invertir con calma.</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  )
}
