'use client'

import FinnicOwlIcon from '@/components/ui/FinnicOwlIcon'
import { useFinnicPanel } from '../finnic-panel/FinnicPanelProvider'

/** Abre y cierra el panel de Finnic (no navega). */
export default function SidebarFinnicButton({ collapsed }: { collapsed: boolean }) {
  const { open, togglePanel } = useFinnicPanel()
  return (
    <button
      type="button"
      onClick={togglePanel}
      aria-pressed={open}
      aria-label={collapsed ? 'Finnic' : undefined}
      title={collapsed ? 'Finnic (⌘J)' : undefined}
      className={`mb-3 flex h-11 items-center rounded-full text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 ${
        collapsed ? 'mx-auto w-11 justify-center' : 'gap-3 px-3'
      } ${open ? 'bg-surface-soft text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#083A4F] dark:bg-surface-soft">
        <FinnicOwlIcon color="cream" className="h-5 w-5" />
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-left">Finnic</span>
          <kbd className="rounded-md border border-border px-1.5 text-[10px] font-semibold text-muted-foreground">⌘J</kbd>
        </>
      )}
    </button>
  )
}
