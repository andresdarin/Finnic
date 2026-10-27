'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Settings2, Sprout } from 'lucide-react'
import BannerFeatherPattern from '@/components/ui/BannerFeatherPattern'
import { InfoHint } from '@/components/ui/InfoHint'
import { HERO_HINTS } from '../constants'
import type { TranquilityDashboard } from '../types'
import { availableToSpend, money, monthLabel } from '../utils'

const glassButton = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[#C0D5D6] transition-[background-color,scale] hover:bg-white/[0.12] hover:text-[#F5F2EE] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C0D5D6]/60'

interface TranquilityHeroProps {
  dashboard?: TranquilityDashboard
  month?: string
  onShiftMonth?: (delta: number) => void
  settingsOpen?: boolean
  onToggleSettings?: () => void
  subtitle?: string
}

/**
 * Encabezado navy de borde a borde, igual que Balance y Finanzas:
 * vuelta a Balance, mes, título y la cifra que más importa con sus métricas.
 */
export function TranquilityHero({ dashboard, month, onShiftMonth, settingsOpen, onToggleSettings, subtitle }: TranquilityHeroProps) {
  return (
    <section className="relative w-full overflow-hidden rounded-b-[2rem] border-b border-black/10 bg-gradient-to-b from-[#062433] via-[#083A4F] to-[#072F40] px-4 pb-7 pt-[calc(1rem+env(safe-area-inset-top))] text-[#F5F2EE] shadow-[0_12px_30px_rgba(8,58,79,0.12)] sm:rounded-b-[2.5rem] sm:px-6 sm:pb-9 md:px-8 dark:border-white/[0.06] dark:from-[#04141D] dark:via-[#061D27] dark:to-[#051720] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
      <BannerFeatherPattern />
      <div className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-[#407E8C]/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-20 h-64 w-64 rounded-full bg-[#A58D66]/10 blur-3xl" />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-5">
        <div className="flex items-center justify-between gap-2">
          <Link href="/balance" aria-label="Volver a Balance" className={glassButton}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          {month && onShiftMonth && (
            <div className="flex min-w-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] p-1">
              <button type="button" aria-label="Mes anterior" onClick={() => onShiftMonth(-1)} className="flex h-8 w-8 items-center justify-center rounded-full text-[#C0D5D6] hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C0D5D6]/60">
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="truncate px-1 text-xs font-semibold capitalize text-[#F5F2EE]" aria-live="polite">
                {monthLabel(month)}{dashboard ? ` · ${dashboard.currency}` : ''}
              </span>
              <button type="button" aria-label="Mes siguiente" onClick={() => onShiftMonth(1)} className="flex h-8 w-8 items-center justify-center rounded-full text-[#C0D5D6] hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C0D5D6]/60">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
          {onToggleSettings ? (
            <button type="button" aria-label="Ajustes de Tranquilidad" aria-pressed={settingsOpen} onClick={onToggleSettings} className={`${glassButton} aria-pressed:bg-white/[0.16] aria-pressed:text-[#F5F2EE]`}>
              <Settings2 className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : <span className="h-10 w-10" aria-hidden="true" />}
        </div>

        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#BCA47B]">
            <Sprout className="h-3.5 w-3.5" aria-hidden="true" /> Balance · Tranquilidad
          </p>
          <h1 className="type-display mt-2 text-balance text-[2rem] leading-[1.1] sm:text-[2.5rem]">Tranquilidad financiera</h1>
          {subtitle && <p className="mt-2 max-w-xl text-pretty text-sm text-[#C0D5D6]/85">{subtitle}</p>}
        </div>

        {dashboard && <HeroFigures dashboard={dashboard} />}
      </div>
    </section>
  )
}

function HeroFigures({ dashboard }: { dashboard: TranquilityDashboard }) {
  const totals = dashboard.summary.totals
  const emergency = dashboard.pools.emergency
  const months = dashboard.goalMetrics?.emergency.monthsCovered
  const metrics: [string, string, string][] = [
    ['Ingreso del mes', money(totals?.plannedIncome ?? null, dashboard.currency), HERO_HINTS.ingreso],
    ['Aportes reales', money(totals?.netPoolFunding ?? null, dashboard.currency), HERO_HINTS.aportes],
    ['Capital invertido', money(dashboard.pools.investment.netContributedCapital, dashboard.currency), HERO_HINTS.invertido],
    ['Emergencia', `${money(emergency.balance, dashboard.currency)}${months != null ? ` · ${months.toFixed(1)} m` : ''}`, HERO_HINTS.emergencia],
  ]
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#C0D5D6]/80">
          Disponible para gastar
          <InfoHint label="Disponible para gastar">{HERO_HINTS.disponible}</InfoHint>
        </div>
        <p className="financial-number mt-1 text-4xl text-[#F5F2EE] sm:text-5xl">{money(availableToSpend(dashboard), dashboard.currency)}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map(([label, value, hint]) => (
          <Metric key={label} label={label} hint={hint}>{value}</Metric>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C0D5D6]/80">
        <span className="truncate">{label}</span>
        <InfoHint label={label} className="ml-auto">{hint}</InfoHint>
      </div>
      <p className="mt-1.5 truncate text-sm font-bold tabular-nums text-[#F5F2EE]">{children}</p>
    </div>
  )
}
