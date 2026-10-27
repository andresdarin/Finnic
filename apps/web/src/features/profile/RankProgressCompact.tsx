'use client'

import Link from 'next/link'
import { ArrowUpRight, Trophy } from 'lucide-react'
import { RankShield } from '@/features/gamification/RankShield'
import { RankProgressBar } from '@/features/gamification/RankProgressBar'
import type { GamificationProfile } from '@/features/gamification/ranks.types'

interface RankProgressCompactProps {
  data: GamificationProfile | null
  loading: boolean
}

/**
 * Prominent rank + progress block designed to live inside the editorial hero.
 * Bigger shield (64px), clear XP numbers, and a visible progress bar,
 * so the user immediately grasps their rank and how close they are to the next.
 */
export function RankProgressCompact({ data, loading }: RankProgressCompactProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-4 animate-pulse">
        <div className="h-16 w-16 rounded-2xl bg-white/10 shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-28 rounded bg-white/10" />
          <div className="h-5 w-36 rounded bg-white/10" />
          <div className="h-2 w-full rounded-full bg-white/10" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <p className="text-xs text-muted-foreground">Progreso no disponible</p>
    )
  }

  const { currentRank, nextRank, totalXp, progress } = data
  const isMaxRank = !nextRank

  return (
    <div className="flex flex-col gap-4">
      {/* Shield + Rank name */}
      <div className="flex items-start gap-4">
        <div className="shrink-0 rounded-2xl bg-surface-soft/40 p-2 border border-border/40">
          <RankShield
            tier={currentRank.tier}
            division={currentRank.division}
            colorLabel={currentRank.colorLabel}
            size={64}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Rango actual</p>
          <h3 className="text-xl font-extrabold text-foreground tracking-tight mt-0.5">
            {currentRank.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {currentRank.description}
          </p>
        </div>
      </div>

      {/* Progress section */}
      {isMaxRank ? (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-center text-xs font-semibold text-amber-400">
          <Trophy className="h-4 w-4 shrink-0" />
          <span>¡Rango máximo alcanzado!</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* XP + percentage header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground tabular-nums">
              {totalXp.toLocaleString('es-UY')}
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground ml-1">XP total</span>
            </span>
            <span className="text-xs font-semibold text-primary/90 tabular-nums">{progress.percent}%</span>
          </div>

          {/* Barra de progreso */}
          <div
            role="progressbar"
            aria-valuenow={progress.currentXpInRank}
            aria-valuemin={0}
            aria-valuemax={progress.requiredXpForNextRank}
            aria-label={`${progress.percent}% completado hacia ${nextRank.name}. ${progress.currentXpInRank.toLocaleString('es-UY')} de ${progress.requiredXpForNextRank.toLocaleString('es-UY')} XP`}
          >
            <RankProgressBar percent={progress.percent} color={currentRank.colorLabel} />
          </div>

          {/* XP remaining + link */}
          <div className="flex items-center justify-between text-xs">
            <span className="tabular-nums text-muted-foreground">
              {progress.currentXpInRank.toLocaleString('es-UY')} / {progress.requiredXpForNextRank.toLocaleString('es-UY')} XP
            </span>
            <span className="tabular-nums text-muted-foreground">
              Faltan <strong className="text-foreground/80 font-semibold">{progress.xpRemaining.toLocaleString('es-UY')} XP</strong>
            </span>
          </div>

          <Link
            href="/goals"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md px-1 py-0.5"
            aria-label="Ver metas de rango"
          >
            Ver metas
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  )
}
