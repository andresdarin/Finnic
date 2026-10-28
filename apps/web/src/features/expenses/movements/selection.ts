import type { Movement } from './types'

/**
 * Movimiento seleccionado a partir de su id: siempre la versión más reciente de la lista.
 * Si la lista se refrescó y ya no lo trae (borrado, filtro), no hay selección.
 */
export function resolveSelection(movements: Movement[], selectedId: string | null): Movement | null {
  if (!selectedId) return null
  return movements.find((m) => m.id === selectedId) ?? null
}

/** Id del movimiento vecino para navegar con ↑/↓; se queda en el borde. */
export function adjacentMovementId(movements: Movement[], currentId: string, step: 1 | -1): string {
  const index = movements.findIndex((m) => m.id === currentId)
  if (index === -1) return currentId
  const next = movements[Math.min(Math.max(index + step, 0), movements.length - 1)]
  return next?.id ?? currentId
}
