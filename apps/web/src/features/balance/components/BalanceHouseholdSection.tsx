import { Users } from 'lucide-react'

export default function BalanceHouseholdSection() {
  return (
    <section aria-labelledby="household-heading" className="neu-raised rounded-2xl bg-surface/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Users aria-hidden="true" className="h-4 w-4 text-primary" />
          <h2 id="household-heading" className="text-sm font-bold text-foreground">Hogar compartido</h2>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Próximamente</span>
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">Compartís casa, compartís gastos.</p>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
        Para parejas, roomies, familias y cualquier grupo de personas que viva bajo el mismo techo.
        Vas a poder organizar los gastos del hogar y ver quién pagó qué y cuánto le corresponde a cada persona.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Estamos preparando esta función. Te avisaremos acá cuando esté disponible.</p>
    </section>
  )
}
