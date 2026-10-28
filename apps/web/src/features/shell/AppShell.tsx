'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './sidebar/Sidebar'
import Topbar from './Topbar'
import MobileNav from './MobileNav'
import { FinnicChatProvider } from '@/features/chat/FinnicChatProvider'
import { NewActionProvider } from './new-action/NewActionProvider'

interface AppShellProps {
  children: React.ReactNode
  profile: {
    displayName: string | null
    email: string
    color: string
    isAdmin?: boolean
    role?: string | null
  } | null
  onLogout: () => void
}

/**
 * AppShell unificado.
 * Configura la estructura principal y provee un layout adaptativo.
 */
export default function AppShell({ children, profile, onLogout }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const pathname = usePathname()
  const isFullBleedHero = pathname === '/dashboard' || pathname === '/' || pathname === '/finanzas' || pathname === '/balance' || pathname === '/expenses' || pathname === '/expenses/new' || pathname === '/chat' || pathname === '/tranquilidad-financiera'

  const isChat = pathname === '/chat'

  return (
    <FinnicChatProvider>
    <NewActionProvider>
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
        } ${sidebarCollapsed ? 'lg:pl-[124px]' : 'lg:pl-[292px]'}`}
      >
        <div className={isFullBleedHero ? 'h-full w-full min-w-0' : 'p-4 md:p-6 lg:p-8 w-full min-w-0'}>
          {children}
        </div>
      </main>

      {/* Bottom Nav (Mobile) - Oculto en el chat para input fixed */}
      {!isChat && <MobileNav profile={profile} />}
    </div>
    </NewActionProvider>
    </FinnicChatProvider>
  )
}
