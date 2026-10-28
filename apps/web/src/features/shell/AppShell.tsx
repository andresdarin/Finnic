'use client'

import React from 'react'
import { FinnicChatProvider } from '@/features/chat/FinnicChatProvider'
import { NewActionProvider } from './new-action/NewActionProvider'
import { FinnicPanelProvider } from './finnic-panel/FinnicPanelProvider'
import ShellFrame from './ShellFrame'
import type { ShellProfile } from './types'

interface AppShellProps {
  children: React.ReactNode
  profile: ShellProfile | null
  onLogout: () => void
}

/**
 * AppShell unificado: estado compartido del shell (chat, panel de Finnic,
 * acciones "Nuevo"; ver .10x/adrs/003) y el marco adaptativo.
 */
export default function AppShell({ children, profile, onLogout }: AppShellProps) {
  return (
    <FinnicChatProvider>
      <FinnicPanelProvider>
        <NewActionProvider>
          <ShellFrame profile={profile} onLogout={onLogout}>{children}</ShellFrame>
        </NewActionProvider>
      </FinnicPanelProvider>
    </FinnicChatProvider>
  )
}
