'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import FinnicOwlIcon from '@/components/ui/FinnicOwlIcon'
import ChatConversation from '@/features/chat/components/ChatConversation'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useFinnicPanel } from './FinnicPanelProvider'
import { modKeyLabel } from '../utils/shortcuts'

const PANEL = 'fixed bottom-5 right-5 top-5 z-40 flex w-[400px] flex-col overflow-hidden rounded-[2rem] border border-border/60 bg-background text-foreground shadow-xl'

/**
 * Finnic al costado en desktop. ≥1280px es una región acoplada que convive con
 * la pantalla; entre 1024 y 1279px es un diálogo modal sobre el contenido.
 */
export default function FinnicPanel() {
  const { visible, docked, closePanel } = useFinnicPanel()
  const panelRef = useRef<HTMLDivElement>(null)
  const isModal = visible && !docked
  useFocusTrap(panelRef, isModal)

  useEffect(() => {
    if (!visible) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (isModal || panelRef.current?.contains(document.activeElement)) closePanel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [visible, isModal, closePanel])

  if (!visible) return null

  const content = (
    <>
      <header className="flex shrink-0 items-center gap-3 border-b border-border/60 px-5 py-4">
        <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft">
          <FinnicOwlIcon color="navy" className="h-6 w-6 dark:hidden" />
          <FinnicOwlIcon color="cream" className="hidden h-6 w-6 dark:block" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold tracking-tight">Finnic</h2>
          <p className="text-xs text-muted-foreground">Tu copiloto financiero</p>
        </div>
        <button
          type="button"
          onClick={closePanel}
          aria-label="Cerrar Finnic"
          title={`Cerrar (${modKeyLabel()} J)`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-soft hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <ChatConversation variant="panel" />
    </>
  )

  if (docked) {
    return <aside ref={panelRef} aria-label="Finnic" className={PANEL}>{content}</aside>
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={closePanel} aria-hidden="true" />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Finnic" className={PANEL}>{content}</div>
    </>
  )
}
