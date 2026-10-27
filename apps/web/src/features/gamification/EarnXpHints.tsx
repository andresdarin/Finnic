import { Plus, Camera, ListChecks, ClipboardList } from 'lucide-react'

const HINTS = [
  { icon: Plus, label: 'Crear movimientos', xp: '+5 XP', detail: 'Registrá cualquier gasto manualmente.' },
  { icon: Camera, label: 'Escanear tickets', xp: '+10 XP', detail: 'Usá la cámara para analizar tickets con IA.' },
  { icon: ListChecks, label: 'Cargar productos', xp: '+5 XP', detail: 'Agregá productos al crear un gasto.' },
  { icon: ClipboardList, label: 'Gastos completos', xp: '+5 XP', detail: 'Completá categoría, método de pago y tipo.' },
]

export function EarnXpHints() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Cómo ganar XP</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {HINTS.map((hint) => (
          <div
            key={hint.label}
            className="flex items-center gap-3 rounded-xl border border-border bg-white/5 px-4 py-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <hint.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{hint.label}</p>
              <p className="text-xs text-muted-foreground">{hint.detail}</p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-success">{hint.xp}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
