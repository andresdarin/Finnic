'use client'

import { useEffect } from 'react'
import { MousePointerClick } from 'lucide-react'
import MovementDetailContent from './MovementDetailContent'
import type { Movement } from './types'

interface Props {
  movement: Movement | null
  onClose: () => void
}

/** Detalle como columna junto a la tabla (desktop con lugar). No es modal: la tabla sigue usable. */
export default function MovementDetailPanel({ movement, onClose }: Props) {
  useEffect(() => {
    if (!movement) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (document.querySelector('[aria-modal="true"], [role="menu"]')) return
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [movement, onClose])

  return (
    <aside
      aria-label="Detalle del movimiento"
      className="sticky top-6 flex max-h-[calc(100dvh-3rem)] flex-col overflow-y-auto rounded-3xl border border-border/80 bg-surface shadow-xs"
    >
      {movement ? (
        <MovementDetailContent movement={movement} onClose={onClose} />
      ) : (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-soft text-muted-foreground">
            <MousePointerClick className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-bold text-foreground">Elegí un movimiento</p>
          <p className="text-xs text-muted-foreground">Vas a ver acá su detalle. Con ↑ y ↓ pasás al anterior o al siguiente.</p>
        </div>
      )}
    </aside>
  )
}
