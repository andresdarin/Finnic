'use client'

import MovementDetailContent from './MovementDetailContent'
import type { Movement } from './types'

interface Props {
  movement: Movement | null
  onClose: () => void
}

/** Detalle modal: hoja inferior en móvil y panel lateral cuando la página no tiene lugar para la columna. */
export default function MovementDetailDrawer({ movement, onClose }: Props) {
  if (!movement) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del movimiento"
        className="neu-raised fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl border border-border/50 bg-surface lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[420px] lg:rounded-l-3xl lg:rounded-tr-none select-none flex flex-col"
      >
        <MovementDetailContent movement={movement} onClose={onClose} />
      </aside>
    </>
  )
}
