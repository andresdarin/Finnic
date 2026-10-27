'use client'

import React from 'react'
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Bell, type LucideIcon } from 'lucide-react'
import { useProfile } from '@/features/auth/ProfileProvider'
import type { BalanceProps } from '../types'
import { accountTotals, money, totalsFromSnapshot } from '../utils'
import BannerFeatherPattern from '@/components/ui/BannerFeatherPattern'
import FinnicBrand from '@/components/ui/FinnicBrand'
import { InfoHint } from '@/components/ui/InfoHint'
import { BALANCE_HINTS } from '../constants'

function Metric({ label, value, icon: Icon, hint }: { label: string; value: string; icon: LucideIcon; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.03] p-2.5 sm:p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C0D5D6]/70">
        <Icon className="h-3 w-3" aria-hidden="true" />
        {label}
        <InfoHint label={label} className="ml-auto">{hint}</InfoHint>
      </div>
      <p className="mt-1.5 truncate text-sm font-bold tabular-nums text-[#F5F2EE]">{value}</p>
    </div>
  )
}

export default function BalanceHero({ accounts, snapshot }: BalanceProps) {
  const { profile } = useProfile()

  const userInitial = (profile?.displayName?.[0] ?? profile?.email[0] ?? '?').toUpperCase()
  const initials = profile?.displayName
    ? profile.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : userInitial

  const available = totalsFromSnapshot(snapshot, 'spendableByCurrency')
  const fallback = accountTotals(accounts)
  if (!snapshot) Object.assign(available, fallback)
  const debt = totalsFromSnapshot(snapshot, 'creditDebtByCurrency')
  const estimated = snapshot?.balances?.spendableInBase ?? snapshot?.spendableInBase
  const estimatedAmount = estimated?.amount == null ? null : Number(estimated.amount)
  const availableLabel = available.UYU || available.USD ? `${money(available.UYU, 'UYU')}${available.USD ? ` · ${money(available.USD, 'USD')}` : ''}` : '—'
  const debtLabel = debt.UYU || debt.USD ? `${money(debt.UYU, 'UYU')}${debt.USD ? ` · ${money(debt.USD, 'USD')}` : ''}` : '—'

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#062433] via-[#083A4F] to-[#072F40] dark:from-[#04141D] dark:via-[#061D27] dark:to-[#051720] pt-[calc(0.5rem+env(safe-area-inset-top))] pb-7 sm:pb-9 px-4 sm:px-6 md:px-8 rounded-b-[2rem] sm:rounded-b-[2.5rem] border-b border-black/10 dark:border-white/[0.06] shadow-[0_12px_30px_rgba(8,58,79,0.12)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
      {/* Plumas de fondo estáticas sutiles */}
      <BannerFeatherPattern />

      {/* Luces de ambiente sutiles */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-[#407E8C]/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-20 h-64 w-64 rounded-full bg-[#A58D66]/10 blur-3xl" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-4 sm:gap-5">
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

        {/* 2. Eyebrow y Cifra Principal */}
        <div className="flex items-center gap-2.5 pt-1">
          <CircleDollarSign className="h-4 w-4 text-[#A58D66]" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#A58D66] dark:text-[#BCA47B]">
            Balance / Tu posición actual
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#C0D5D6]/70">
            <p>{estimatedAmount != null ? 'Patrimonio estimado' : 'Patrimonio disponible'}</p>
            <InfoHint label="tu patrimonio">{BALANCE_HINTS.patrimonio}</InfoHint>
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <strong className="financial-number text-3xl sm:text-5xl text-[#F5F2EE]">
              {estimatedAmount != null
                ? money(estimatedAmount, (estimated?.currency === 'USD' ? 'USD' : 'UYU'))
                : available.UYU
                ? money(available.UYU, 'UYU')
                : money(available.USD, 'USD')}
            </strong>
            {estimatedAmount == null && available.USD > 0 && available.UYU > 0 && (
              <span className="text-sm font-bold text-[#C0D5D6] tabular-nums">
                · {money(available.USD, 'USD')}
              </span>
            )}
          </div>
          {estimatedAmount != null && (
            <p className="mt-1 text-[11px] text-[#C0D5D6]/70">
              Equivalente estimado en UYU · saldos originales abajo
            </p>
          )}
        </div>

        {/* 3. Métricas */}
        <div className="grid grid-cols-3 gap-2 border-t border-white/[0.08] pt-3.5 sm:gap-3">
          <Metric label="Disponible" value={availableLabel} icon={ArrowDownLeft} hint={BALANCE_HINTS.disponible} />
          <Metric label="Por pagar" value={debtLabel} icon={ArrowUpRight} hint={BALANCE_HINTS.porPagar} />
          <Metric label="A favor" value="—" icon={CircleDollarSign} hint={BALANCE_HINTS.aFavor} />
        </div>
      </div>
    </section>
  )
}
