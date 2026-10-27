'use client'

import { Target, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import LiquidGlass from '@/components/ui/LiquidGlass'

const PLACEHOLDER_GOALS = [
  { label: 'Registrar 5 gastos', description: 'Lleva el control de tus movimientos.' },
  { label: 'Subir un ticket', description: 'Escaneá o subí tu primer ticket.' },
  { label: 'Completar tu perfil', description: 'Agregá nombre y foto.' },
]

/**
 * Compact sidebar card showing the next goals the user can pursue.
 */
export function NextGoalsCard() {
  return (
    <LiquidGlass variant="card" intensity="medium" className="neu-raised p-5 border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Próximas metas</h3>
        </div>
        <Link
          href="/goals"
          className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md px-1.5 py-0.5"
          aria-label="Ver todas las metas"
        >
          Ver todas
        </Link>
      </div>

      <div className="space-y-2">
        {PLACEHOLDER_GOALS.map((goal) => (
          <div
            key={goal.label}
            className="flex items-center gap-3 rounded-xl bg-surface-soft/25 border border-border/30 p-3 transition-colors duration-200 hover:bg-surface-soft/45"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              <ArrowRight className="h-3 w-3 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{goal.label}</p>
              <p className="text-[10px] text-muted-foreground truncate">{goal.description}</p>
            </div>
          </div>
        ))}
      </div>
    </LiquidGlass>
  )
}
