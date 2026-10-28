import { Search } from 'lucide-react'

/** Formulario GET: la búsqueda vive en la URL y funciona sin JavaScript. */
export function UserSearch({ q }: { q: string }) {
  return (
    <form role="search" action="/users" className="flex w-full gap-2 sm:w-auto">
      <label className="relative flex-1 sm:w-72">
        <span className="sr-only">Buscar por email o nombre</span>
        <Search aria-hidden size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          type="search"
          defaultValue={q}
          maxLength={100}
          placeholder="Email o nombre"
          className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground/70"
        />
      </label>
      <button type="submit" className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
        Buscar
      </button>
    </form>
  )
}
