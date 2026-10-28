/**
 * Aviso global de que los datos financieros cambiaron fuera de la pantalla actual
 * (Finnic confirmó una acción, se guardó un ingreso desde el shell, etc.).
 * Solo lo emiten mutaciones; los refetch nunca lo emiten, para no generar bucles.
 * Ver .10x/adrs/003-desktop-shell-shared-state.md.
 */
export const DATA_CHANGED_EVENT = 'finnic:data-changed'

export function emitDataChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT))
}

/** Suscribe `listener` y devuelve la función para desuscribirlo. */
export function onDataChanged(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(DATA_CHANGED_EVENT, listener)
  return () => window.removeEventListener(DATA_CHANGED_EVENT, listener)
}
