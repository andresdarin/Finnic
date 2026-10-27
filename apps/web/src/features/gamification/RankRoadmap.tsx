import { RANKS } from './ranks.constants'
import { RankShield } from './RankShield'
import type { GamificationProfile } from './ranks.types'

interface RankRoadmapProps {
  profile: GamificationProfile
}

export function RankRoadmap({ profile }: RankRoadmapProps) {
  const currentIndex = RANKS.indexOf(profile.currentRank)

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Todos los rangos</h3>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {RANKS.map((rank, i) => {
          const unlocked = i <= currentIndex
          const isCurrent = i === currentIndex

          return (
            <div
              key={rank.key}
              className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 transition-colors ${
                isCurrent
                  ? 'border-primary/30 bg-primary/5'
                  : unlocked
                    ? 'border-border bg-white/5'
                    : 'border-transparent bg-white/[0.02]'
              }`}
            >
              <RankShield
                tier={rank.tier}
                division={rank.division}
                colorLabel={rank.colorLabel}
                size={36}
                unlocked={unlocked}
              />

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    unlocked ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {rank.name}
                </p>
                <p
                  className={`text-xs ${
                    unlocked ? 'text-muted-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {rank.minXp.toLocaleString('es-UY')} XP
                </p>
              </div>

              {isCurrent && (
                <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Actual
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
