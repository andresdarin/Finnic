'use client'

import { useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { Search } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useNewAction } from '../new-action/NewActionProvider'
import { useFinnicPanel } from '../finnic-panel/FinnicPanelProvider'
import { buildCommands, type CommandContext, type PaletteCommand } from './commands'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  isAdmin: boolean
}

const GROUPS: PaletteCommand['group'][] = ['Ir a', 'Acciones']

/** Paleta ⌘K: ir a una pantalla o lanzar una acción (ADR-004). */
export default function CommandPalette({ open, onClose, isAdmin }: CommandPaletteProps) {
  const router = useRouter()
  const { runAction } = useNewAction()
  const { openPanel } = useFinnicPanel()
  const dialog = useRef<HTMLDivElement>(null)
  const commands = useMemo(() => buildCommands({ isAdmin }), [isAdmin])
  useFocusTrap(dialog, open)

  if (!open) return null

  const ctx: CommandContext = { navigate: (href) => router.push(href), runAction, openFinnic: openPanel }
  const select = (command: PaletteCommand) => { onClose(); command.run(ctx) }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-label="Paleta de comandos" className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <Command label="Paleta de comandos" loop onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }}>
          <div className="flex items-center gap-2 border-b border-border/60 px-4 focus-within:border-primary/60">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Command.Input autoFocus placeholder="Buscá una pantalla o acción" aria-label="Buscá una pantalla o acción"
              className="h-12 w-full bg-transparent text-sm text-foreground outline-none focus-visible:outline-none placeholder:text-muted-foreground" />
            <kbd aria-hidden="true" className="rounded-md border border-border px-1.5 text-[10px] font-semibold text-muted-foreground">Esc</kbd>
          </div>
          <Command.List className="max-h-[50vh] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">No encontramos nada con ese nombre.</Command.Empty>
            {GROUPS.map((group) => (
              <Command.Group key={group} heading={group}
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground">
                {commands.filter((c) => c.group === group).map((command) => (
                  <Command.Item key={command.id} value={command.id} keywords={[command.label, ...command.keywords]} onSelect={() => select(command)}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground data-[selected=true]:bg-surface-soft">
                    <command.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    {command.label}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
