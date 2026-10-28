'use client'

export default function PanelError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="font-semibold">No pudimos cargar los datos</h2>
      <p className="mt-1 text-sm text-muted-foreground">La API no respondió. Probá de nuevo en unos segundos.</p>
      <button onClick={reset} className="mt-4 h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
        Reintentar
      </button>
    </div>
  )
}
