'use client'

import React from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import FinnicBrand from '@/components/ui/FinnicBrand'
import FinnicOwlIcon from '@/components/ui/FinnicOwlIcon'

interface DashboardTopBarProps {
  profile: {
    displayName: string | null
    email: string
    color: string
    avatarUrl?: string | null
  } | null
}

/**
 * TopBar minimalista integrado en el Hero superior.
 * Tipografía precisa, superficies translúcidas suaves y cero ruido visual.
 */
export default function DashboardTopBar({ profile }: DashboardTopBarProps) {
  const userInitial = (profile?.displayName?.[0] ?? profile?.email[0] ?? '?').toUpperCase()
  const initials = profile?.displayName
    ? profile.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : userInitial

  return (
    <div className="flex items-center justify-between pb-3 select-none">
      {/* Brand logo & name horizontal */}
      <FinnicBrand variant="cream" size="md" />

      {/* Action controls / Profile Avatar */}
      <div className="flex items-center gap-2">
        {/* Chat con Finnic */}
        <Link
          href="/chat"
          aria-label="Chat con Finnic"
          className="group flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] border border-white/8 backdrop-blur-md transition-all hover:bg-white/[0.12] hover:border-white/15 active:scale-95 focus:outline-none"
          title="Copiloto Finnic"
        >
          <FinnicOwlIcon color="aqua" className="h-5 w-5 group-hover:scale-110 transition-transform" />
        </Link>

        {/* Notificaciones */}
        <button
          type="button"
          aria-label="Notificaciones"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-[#C0D5D6] border border-white/8 backdrop-blur-md transition-all hover:bg-white/[0.12] hover:text-[#F5F2EE] active:scale-95 focus:outline-none"
          title="Notificaciones"
        >
          <Bell className="h-4 w-4 stroke-[2]" />
        </button>

        {/* Profile Avatar */}
        {profile && (
          <div className="relative shrink-0 select-none">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-white text-xs shadow-xs overflow-hidden ring-1 ring-white/20"
              style={{
                background: `linear-gradient(135deg, ${profile.color ?? '#407E8C'}dd, #083A4F)`,
              }}
              title={profile.displayName ?? profile.email}
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName ?? 'Foto de perfil'}
                  className="h-full w-full rounded-full object-cover block shrink-0"
                />
              ) : (
                <span className="text-[11px] font-bold tracking-wide text-[#F5F2EE]">
                  {initials}
                </span>
              )}
            </div>
            <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-[#A58D66] ring-2 ring-[#083A4F]" />
          </div>
        )}
      </div>
    </div>
  )
}
