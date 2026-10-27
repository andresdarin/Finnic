import { LogOut } from 'lucide-react'

/** POST común a `/auth/logout` (sin Server Actions ni JavaScript). */
export function SignOutButton() {
  return (
    <form method="post" action="/auth/logout">
      <button type="submit" className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-sm font-medium hover:bg-surface-alt">
        <LogOut aria-hidden size={15} /> Salir
      </button>
    </form>
  )
}
