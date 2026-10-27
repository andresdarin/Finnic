import { Trophy, ShoppingCart, Receipt, Clock, CalendarCheck, Sparkles, Lock, CheckCircle2 } from 'lucide-react'
import LiquidGlass from '@/components/ui/LiquidGlass'

// Todavía no hay cálculo real de logros en el backend: ninguno se muestra como obtenido
const PLACEHOLDER_BADGES = [
  { icon: Trophy, label: 'Primer movimiento', unlocked: false, desc: 'Registraste tu primer gasto.' },
  { icon: Receipt, label: 'Primer ticket', unlocked: false, desc: 'Subiste tu primer ticket.' },
  { icon: Clock, label: 'Gastos fijos al día', unlocked: false, desc: 'Pagaste todos tus gastos recurrentes.' },
  { icon: CalendarCheck, label: 'Mes bajo control', unlocked: false, desc: 'Terminaste un mes dentro del presupuesto.' },
  { icon: ShoppingCart, label: 'Supermercado', unlocked: false, desc: 'Registraste una compra de supermercado.' },
  { icon: Sparkles, label: 'Datos limpios', unlocked: false, desc: 'Asignaste categorías correctas a tus gastos.' },
]

/**
 * Featured achievements section with improved contrast for locked badges.
 * Unlocked badges come first with coral accent; locked badges are visible
 * but clearly differentiated via opacity, not removed from the layout.
 */
export function FeaturedAchievements() {
  const unlocked = PLACEHOLDER_BADGES.filter((b) => b.unlocked)
  const locked = PLACEHOLDER_BADGES.filter((b) => !b.unlocked)
  const sorted = [...unlocked, ...locked]

  return (
    <LiquidGlass variant="card" intensity="medium" className="neu-raised p-6 border border-border/50">
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">Logros destacados</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {unlocked.length} de {PLACEHOLDER_BADGES.length} desbloqueados
          </p>
        </div>
      </div>

      {/* Badges grid — unlocked first, locked with lower contrast */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {sorted.map((badge) => {
          const Icon = badge.icon
          return (
            <div
              key={badge.label}
              className="group relative flex flex-col items-center gap-3 text-center transition-all duration-300"
              title={badge.desc}
              role="img"
              aria-label={`Logro: ${badge.label}. ${badge.unlocked ? 'Desbloqueado' : 'Bloqueado'}`}
            >
              <div
                className={`relative flex h-16 w-16 items-center justify-center rounded-full border transition-all duration-300 ${
                  badge.unlocked
                    ? 'border-gold/40 bg-gold/10 text-gold group-hover:scale-105 group-hover:border-gold/70 group-hover:bg-gold/15 group-hover:shadow-md group-hover:shadow-gold/10'
                    : 'border-border/60 bg-surface-soft/40 text-muted-foreground group-hover:border-border group-hover:bg-surface-soft'
                }`}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
                {badge.unlocked ? (
                  <div className="absolute -right-1 -top-0.5 rounded-full bg-gold p-0.5 border-2 border-background shadow-xs">
                    <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                  </div>
                ) : (
                  <div className="absolute -right-1 -top-0.5 rounded-full bg-surface-soft border-2 border-background p-0.5 shadow-xs">
                    <Lock className="h-2.5 w-2.5 text-muted-foreground" aria-hidden="true" />
                  </div>
                )}
              </div>

              <p
                className={`text-[11px] font-bold leading-tight max-w-[90px] ${
                  badge.unlocked ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {badge.label}
              </p>
            </div>
          )
        })}
      </div>

      <p className="mt-5 text-center text-[10px] text-muted-foreground">
        Próximamente — más desafíos y recompensas en camino
      </p>
    </LiquidGlass>
  )
}

/** Returns the count of unlocked and total achievements for summary usage */
export function getAchievementCounts() {
  const unlocked = PLACEHOLDER_BADGES.filter((b) => b.unlocked).length
  return { unlocked, total: PLACEHOLDER_BADGES.length }
}
