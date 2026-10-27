'use client'

import React from 'react'
import DashboardTopBar from './DashboardTopBar'
import DashboardGreeting from './DashboardGreeting'
import DashboardFinancialHero from './DashboardFinancialHero'
import BannerFeatherPattern from '@/components/ui/BannerFeatherPattern'

interface DashboardHeroProps {
  profile: {
    displayName: string | null
    email: string
    color: string
    avatarUrl?: string | null
  } | null
}

/**
 * Franja superior Hero en modo negativo/invertido de Finnic.
 * Full-bleed (top edge y laterales), fondo Navy profundo, tipografía Sand/Aqua y terminación con border-radius inferior.
 */
export default function DashboardHero({ profile }: DashboardHeroProps) {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#062433] via-[#083A4F] to-[#072F40] dark:from-[#04141D] dark:via-[#061D27] dark:to-[#051720] pt-[calc(1.25rem+env(safe-area-inset-top))] pb-7 sm:pb-9 px-4 sm:px-6 md:px-8 rounded-b-[2rem] sm:rounded-b-[2.5rem] border-b border-black/10 dark:border-white/[0.06] shadow-[0_12px_30px_rgba(8,58,79,0.12)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
      {/* Plumas de fondo estáticas sutiles */}
      <BannerFeatherPattern />

      {/* Luces de ambiente sutiles */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-[#407E8C]/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-20 h-64 w-64 rounded-full bg-[#A58D66]/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl flex flex-col gap-3 sm:gap-4">
        {/* 1. Header superior (Logo + Campana + Avatar) */}
        <DashboardTopBar profile={profile} />

        {/* 2. Saludo, Período y Chip de Hogar */}
        <DashboardGreeting
          displayName={profile?.displayName ?? null}
          email={profile?.email}
        />

        {/* 3. Hero Financiero Principal */}
        <DashboardFinancialHero />
      </div>
    </section>
  )
}
