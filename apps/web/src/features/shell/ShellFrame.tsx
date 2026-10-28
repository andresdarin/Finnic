'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { usePersistentFlag } from '@/hooks/usePersistentFlag'
import Sidebar from './sidebar/Sidebar'
import Topbar from './Topbar'
import MobileNav from './MobileNav'
import FinnicPanel from './finnic-panel/FinnicPanel'
import { useFinnicPanel } from './finnic-panel/FinnicPanelProvider'
import { FULL_BLEED_ROUTES, SIDEBAR_COLLAPSED_KEY } from './constants'
import type { ShellProfile } from './types'

interface ShellFrameProps {
  children: React.ReactNode
  profile: ShellProfile | null
  onLogout: () => void
}

/** Marco visual: sidebar y panel de Finnic en desktop, Topbar y nav inferior en móvil. */
export default function ShellFrame({ children, profile, onLogout }: ShellFrameProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistentFlag(SIDEBAR_COLLAPSED_KEY, false)
  const { visible: panelVisible, docked } = useFinnicPanel()
  const pathname = usePathname()
  const isFullBleedHero = FULL_BLEED_ROUTES.includes(pathname)
  const isChat = pathname === '/chat'
  // El panel acoplado (≥1280) reserva su ancho + margen; superpuesto no empuja nada.
  const panelPadding = panelVisible && docked ? 'xl:pr-[424px]' : ''

  return (
    <div className="app-backdrop min-h-screen text-foreground overflow-x-hidden relative">
      {/* Sidebar (Desktop) */}
      <Sidebar
        profile={profile}
        onLogout={onLogout}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Topbar (Mobile) - Se omite en vistas con Hero full-bleed invertido */}
      {!isFullBleedHero && <Topbar profile={profile} />}

      {/* Contenido Principal */}
      <main
        className={`w-full max-w-full min-w-0 overflow-x-hidden transition-all duration-300 ease-in-out ${
          isChat
            ? 'h-[100dvh] overflow-hidden p-0'
            : 'min-h-[calc(100dvh-4rem)] lg:min-h-screen pb-[calc(104px+env(safe-area-inset-bottom))] lg:pb-0'
        } ${sidebarCollapsed ? 'lg:pl-[124px]' : 'lg:pl-[292px]'} ${panelPadding}`}
      >
        <div className={isFullBleedHero ? 'h-full w-full min-w-0' : 'p-4 md:p-6 lg:p-8 w-full min-w-0'}>
          {children}
        </div>
      </main>

      <FinnicPanel />

      {/* Bottom Nav (Mobile) - Oculto en el chat para input fixed */}
      {!isChat && <MobileNav profile={profile} />}
    </div>
  )
}
