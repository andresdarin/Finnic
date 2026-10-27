import { NavLink } from './NavLink'
import { SignOutButton } from './SignOutButton'

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <p className="font-display text-lg">
            Finnic <span className="text-sm font-sans font-semibold uppercase tracking-[0.14em] text-accent-ink">Admin</span>
          </p>
          <nav aria-label="Secciones" className="order-3 flex w-full gap-1 sm:order-none sm:w-auto">
            <NavLink href="/">Resumen</NavLink>
            <NavLink href="/users">Usuarios</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden max-w-[220px] truncate text-sm text-muted-foreground md:inline" title={email}>{email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  )
}
