export type ShortcutAction = 'palette' | 'finnic' | 'new'

export interface ShortcutKey {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
}

export interface ShortcutContext {
  /** El foco está en un campo donde se escribe. */
  editing: boolean
  /** Hay un diálogo abierto (modal de acción, paleta, detalle). */
  layerOpen: boolean
}

/**
 * Traduce una tecla a un atajo del shell desktop.
 * ⌘J/Ctrl+J funciona siempre (abre y cierra Finnic); ⌘K y N no compiten con capas abiertas,
 * y N tampoco con el texto que se está escribiendo.
 */
export function matchShortcut(event: ShortcutKey, ctx: ShortcutContext): ShortcutAction | null {
  const mod = event.metaKey || event.ctrlKey
  const key = event.key.toLowerCase()
  if (mod && !event.altKey && !event.shiftKey && key === 'j') return 'finnic'
  if (ctx.layerOpen) return null
  if (mod && !event.altKey && !event.shiftKey && key === 'k') return 'palette'
  if (!mod && !event.altKey && key === 'n' && !ctx.editing) return 'new'
  return null
}

export function isEditable(element: Element | null): boolean {
  if (!element) return false
  if (element instanceof HTMLElement && element.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
}

export function isLayerOpen(): boolean {
  return document.querySelector('[aria-modal="true"], [role="menu"]') !== null
}
