'use client'

import { useEffect, useRef } from 'react'
import { isEditable, isLayerOpen, matchShortcut, type ShortcutAction } from '../utils/shortcuts'

/** Atajos de teclado del shell. Solo se registran en desktop (`enabled`). */
export function useGlobalShortcuts(enabled: boolean, handlers: Record<ShortcutAction, () => void>) {
  const latest = useRef(handlers)
  latest.current = handlers

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return
      const action = matchShortcut(event, { editing: isEditable(document.activeElement), layerOpen: isLayerOpen() })
      if (!action) return
      event.preventDefault()
      latest.current[action]()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
