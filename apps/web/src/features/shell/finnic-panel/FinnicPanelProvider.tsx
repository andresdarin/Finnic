'use client'

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { usePersistentFlag } from '@/hooks/usePersistentFlag'
import { DESKTOP_QUERY, WIDE_DESKTOP_QUERY, useMediaQuery } from '@/hooks/useMediaQuery'
import { FINNIC_PANEL_OPEN_KEY } from '../constants'

interface FinnicPanelState {
  /** El usuario lo dejó abierto (se recuerda entre sesiones). */
  open: boolean
  /** Se ve ahora: abierto y en pantalla ≥1024px. */
  visible: boolean
  /** ≥1280px: acoplado y empuja el contenido; si no, se superpone como diálogo. */
  docked: boolean
  isDesktop: boolean
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
}

const FinnicPanelContext = createContext<FinnicPanelState | null>(null)

/** Estado abierto/cerrado del panel de Finnic en desktop (ADR-003). */
export function FinnicPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = usePersistentFlag(FINNIC_PANEL_OPEN_KEY, false)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const isWide = useMediaQuery(WIDE_DESKTOP_QUERY)
  const openPanel = useCallback(() => setOpen(true), [setOpen])
  const closePanel = useCallback(() => setOpen(false), [setOpen])
  const togglePanel = useCallback(() => setOpen((prev) => !prev), [setOpen])

  const value = useMemo<FinnicPanelState>(() => ({
    open, visible: open && isDesktop, docked: isWide, isDesktop, openPanel, closePanel, togglePanel,
  }), [open, isDesktop, isWide, openPanel, closePanel, togglePanel])

  return <FinnicPanelContext.Provider value={value}>{children}</FinnicPanelContext.Provider>
}

export function useFinnicPanel() {
  const value = useContext(FinnicPanelContext)
  if (!value) throw new Error('useFinnicPanel debe usarse dentro de FinnicPanelProvider')
  return value
}
