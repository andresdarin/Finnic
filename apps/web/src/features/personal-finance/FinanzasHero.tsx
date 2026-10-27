'use client'

import React from 'react'
import { ChevronLeft, ChevronRight, Bell } from 'lucide-react'
import { monthLabel, formatCurrency } from './constants'
import type { MonthlySummary } from './types'
import BannerFeatherPattern from '@/components/ui/BannerFeatherPattern'
import FinnicBrand from '@/components/ui/FinnicBrand'
import { InfoHint } from '@/components/ui/InfoHint'
import { FINANZAS_HINTS } from './constants'

interface FinanzasHeroProps {
  profile: {
    displayName: string | null
    email: string
    color: string
    avatarUrl?: string | null
  } | null
  monthKey: string
  onShiftMonth: (delta: number) => void
  summary: MonthlySummary
}

interface StatMetricProps {
  label: string
  value: string
  dotColor: string
  highlighted?: boolean
}

function StatMetric({ label, value, dotColor, highlighted = false }: StatMetricProps) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-xl p-2.5 sm:p-3 transition-all ${
        highlighted
          ? 'bg-white/[0.08] border border-white/[0.18] shadow-[0_4px_16px_rgba(0,0,0,0.15)] ring-1 ring-white/[0.08]'
          : 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05]'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] sm:text-[11px] font-medium truncate ${
            highlighted ? 'text-[#F5F2EE] font-semibold' : 'text-[#C0D5D6]/70'
          }`}
        >
          {label}
        </span>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
      </div>
      <span
        className={`text-base sm:text-lg md:text-xl font-bold tracking-tight tabular-nums break-words ${
          highlighted ? 'text-[#F5F2EE]' : 'text-[#F5F2EE]/90'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

export default function FinanzasHero({
  profile,
  monthKey,
  onShiftMonth,
  summary,
}: FinanzasHeroProps) {
  const userInitial = (profile?.displayName?.[0] ?? profile?.email[0] ?? '?').toUpperCase()
  const initials = profile?.displayName
    ? profile.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : userInitial

  const isNetPositive = summary.netByCurrency.UYU >= 0 && summary.netByCurrency.USD >= 0

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#062433] via-[#083A4F] to-[#072F40] dark:from-[#04141D] dark:via-[#061D27] dark:to-[#051720] pt-[calc(0.5rem+env(safe-area-inset-top))] pb-7 sm:pb-9 px-4 sm:px-6 md:px-8 rounded-b-[2rem] sm:rounded-b-[2.5rem] border-b border-black/10 dark:border-white/[0.06] shadow-[0_12px_30px_rgba(8,58,79,0.12)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
      {/* Plumas de fondo estáticas sutiles */}
      <BannerFeatherPattern />

      {/* Luces de ambiente sutiles */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-[#407E8C]/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-20 h-64 w-64 rounded-full bg-[#A58D66]/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl flex flex-col gap-4 sm:gap-5">
        {/* 1. Header superior (Logo + Notificación + Avatar) */}
        <div className="flex items-center justify-between pb-2 pt-1 select-none">
          <FinnicBrand variant="cream" size="md" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Notificaciones"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-[#C0D5D6] border border-white/8 backdrop-blur-md transition-all hover:bg-white/[0.12] hover:text-[#F5F2EE] active:scale-95 focus:outline-none"
              title="Notificaciones"
            >
              <Bell className="h-3.5 w-3.5 stroke-[2]" />
            </button>

            {profile && (
              <div className="relative shrink-0 select-none">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full font-bold text-white text-xs shadow-xs overflow-hidden ring-1 ring-white/20"
                  style={{
                    background: `linear-gradient(135deg, ${profile.color ?? '#407E8C'}dd, #083A4F)`,
                  }}
                  title={profile.displayName ?? profile.email}
                >
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName ?? 'Avatar'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Selector de Período y Eyebrow */}
        <div className="flex flex-col gap-1 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#A58D66] dark:text-[#BCA47B]">
              Finanzas Personales
            </span>

            {/* Navegador de mes flotante estilo glass */}
            <div className="flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 backdrop-blur-sm">
              <button
                onClick={() => onShiftMonth(-1)}
                className="text-[#C0D5D6]/80 hover:text-white p-1 transition-colors"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-semibold text-[#F5F2EE] px-1.5 uppercase tracking-wide">
                {monthLabel(monthKey)}
              </span>
              <button
                onClick={() => onShiftMonth(1)}
                className="text-[#C0D5D6]/80 hover:text-white p-1 transition-colors"
                aria-label="Siguiente mes"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Cifra Principal: Balance Neto del Mes */}
          <div className="mt-3 flex flex-col items-center justify-center text-center">
            <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#C0D5D6]/70">
              Balance neto del mes
              <InfoHint label="el balance neto del mes">{FINANZAS_HINTS.balanceNeto}</InfoHint>
            </span>
            <div className="mt-1 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
              <span className="text-3xl font-extrabold tracking-tight text-[#F5F2EE] sm:text-4xl tabular-nums">
                {formatCurrency(summary.netByCurrency.UYU)}
              </span>
              {summary.netByCurrency.USD !== 0 && (
                <span className="text-xl font-bold tracking-tight text-[#C0D5D6] sm:text-2xl tabular-nums">
                  <span className="text-xs text-[#C0D5D6]/60 mr-1">|</span>
                  US$ {summary.netByCurrency.USD.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.05] px-2.5 py-0.5 text-[10px] font-semibold">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isNetPositive
                    ? 'bg-[#4BE3B5] shadow-[0_0_4px_rgba(75,227,181,0.8)]'
                    : 'bg-[#FF7373] shadow-[0_0_4px_rgba(255,115,115,0.8)]'
                }`}
              />
              <span className={isNetPositive ? 'text-[#4BE3B5]' : 'text-[#FF9E9E]'}>
                {'Ingresos menos egresos · no es saldo disponible'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Tres Métricas Clave en una sola fila (Ingresos, Egresos, Tarjetas/Comprometido) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-white/[0.08] pt-3.5 sm:gap-3">
          <StatMetric
            label="Ingresos"
            value={
              summary.incomeByCurrency.USD > 0
                ? `${formatCurrency(summary.incomeByCurrency.UYU)} + US$${summary.incomeByCurrency.USD.toFixed(0)}`
                : formatCurrency(summary.incomeByCurrency.UYU)
            }
            dotColor="bg-[#4BE3B5] shadow-[0_0_6px_rgba(75,227,181,0.6)]"
            highlighted={summary.incomeByCurrency.UYU > 0 || summary.incomeByCurrency.USD > 0}
          />
          <StatMetric
            label="Egresos"
            value={
              summary.expenseByCurrency.USD > 0
                ? `${formatCurrency(summary.expenseByCurrency.UYU)} + US$${summary.expenseByCurrency.USD.toFixed(0)}`
                : formatCurrency(summary.expenseByCurrency.UYU)
            }
            dotColor="bg-[#72B1BE] shadow-[0_0_6px_rgba(114,177,190,0.6)]"
          />
          <StatMetric
            label="Tarjetas"
            value="Ver desglose por moneda"
            dotColor="bg-[#CCA46D] shadow-[0_0_6px_rgba(204,164,109,0.6)]"
          />
        </div>
      </div>
    </section>
  )
}

