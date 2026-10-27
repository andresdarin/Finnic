import type { GamificationProfile } from '@/features/gamification/ranks.types'

interface ProfileMiniStatsProps {
  gamification: GamificationProfile | null
  isComplete: boolean
  unlockedAchievements: number
  totalAchievements: number
}

/**
 * Four compact stat blocks displayed as a horizontal row inside the hero.
 * Replaces individual cards with dense, scannable metrics.
 */
export function ProfileMiniStats({
  gamification,
  isComplete,
  unlockedAchievements,
  totalAchievements,
}: ProfileMiniStatsProps) {
  const stats = [
    {
      label: 'Rango',
      value: gamification?.currentRank.name ?? '—',
      accent: false,
    },
    {
      label: 'XP',
      value: gamification ? gamification.totalXp.toLocaleString('es-UY') : '—',
      accent: false,
    },
    {
      label: 'Logros',
      value: `${unlockedAchievements} / ${totalAchievements}`,
      accent: unlockedAchievements > 0,
    },
    {
      label: 'Perfil',
      value: isComplete ? 'Completo' : 'Incompleto',
      accent: isComplete,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col items-center gap-0.5 rounded-xl border border-border/40 bg-surface-soft/25 px-3 py-3 backdrop-blur-sm"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {s.label}
          </span>
          <span
            className={`text-sm font-extrabold tabular-nums ${
              s.accent ? 'text-primary' : 'text-foreground'
            }`}
          >
            {s.value}
          </span>
        </div>
      ))}
    </div>
  )
}
