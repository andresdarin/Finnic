'use client'

import { useEffect, useRef, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import { useFloatingPopover } from '@/components/ui/useFloatingPopover'
import { NEW_ACTIONS } from './constants'
import { useNewAction } from './NewActionProvider'

const MENU_ATTR = 'data-new-action-menu'

/** Botón "Nuevo" de la sidebar desktop con el menú de las 5 operaciones. */
export default function NewActionMenu({ collapsed }: { collapsed: boolean }) {
  const { runAction, menuOpen, setMenuOpen } = useNewAction()
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const close = () => { setMenuOpen(false); trigger.current?.focus() }
  const style = useFloatingPopover(trigger, MENU_ATTR, 320, 300, menuOpen, close)

  useEffect(() => {
    if (menuOpen) requestAnimationFrame(() => menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus())
  }, [menuOpen])

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const index = items.indexOf(document.activeElement as HTMLElement)
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    if (step) { event.preventDefault(); items[(index + step + items.length) % items.length]?.focus() }
    if (event.key === 'Tab') close()
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={collapsed ? 'Nuevo registro' : undefined}
        title={collapsed ? 'Nuevo registro (N)' : undefined}
        className={`mt-3 flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 ${collapsed ? 'mx-auto w-11' : 'w-full'}`}
      >
        <Plus className="h-4 w-4 stroke-[2.5]" />
        {!collapsed && <span>Nuevo</span>}
      </button>
      {menuOpen && createPortal(
        <div ref={menu} role="menu" aria-label="Nuevo registro" {...{ [MENU_ATTR]: '' }} style={style} onKeyDown={onMenuKeyDown}
          className="rounded-2xl border border-border bg-surface p-1.5 shadow-xl">
          {NEW_ACTIONS.map(({ type, label, description, icon: Icon, iconClass }) => (
            <button key={type} type="button" role="menuitem" onClick={() => runAction(type)}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-surface-soft focus:bg-surface-soft focus:outline-none">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}><Icon className="h-4 w-4" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-foreground">{label}</span>
                <span className="block truncate text-xs text-muted-foreground">{description}</span>
              </span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}
