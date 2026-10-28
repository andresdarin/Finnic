import { Check, Minus } from 'lucide-react'

/** Sí/No con ícono + texto, nunca solo color. */
export function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-sm ${on ? 'text-success' : 'text-muted-foreground'}`}>
      {on ? <Check aria-hidden size={14} /> : <Minus aria-hidden size={14} />}
      <span className="sr-only">{label}: </span>
      {on ? 'Sí' : 'No'}
    </span>
  )
}
