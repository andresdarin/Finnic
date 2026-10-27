'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useFloatingPopover } from './useFloatingPopover'

const OPEN_EVENT = 'finnic:infohint-open'
const POPOVER_ATTR = 'data-infohint-popover'
const MAX_WIDTH = 260

interface InfoHintProps {
  /** Nombre de la sección: arma la etiqueta accesible "Qué es <label>". */
  label: string
  children: ReactNode
  className?: string
}

/**
 * "i" discreta que abre una burbuja anclada explicando una sección.
 * Abre con tap/Enter; cierra con otro tap, tocando afuera o con Escape. El foco nunca sale de la "i".
 * Solo hay una abierta a la vez. El ícono es de 14px pero el área táctil es de 40×40.
 */
export function InfoHint({ label, children, className = '' }: InfoHintProps) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [width, setWidth] = useState(MAX_WIDTH)

  const close = () => setOpen(false)
  const style = useFloatingPopover(trigger, POPOVER_ATTR, width, 96, open, close)

  // Al abrir una, se cierran las demás
  useEffect(() => {
    const onOther = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) setOpen(false)
    }
    window.addEventListener(OPEN_EVENT, onOther)
    return () => window.removeEventListener(OPEN_EVENT, onOther)
  }, [id])

  function toggle() {
    if (open) return close()
    setWidth(Math.min(MAX_WIDTH, window.innerWidth - 16))
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }))
    setOpen(true)
  }

  const rect = open ? trigger.current?.getBoundingClientRect() : undefined
  const popoverTop = parseFloat(String(style.top ?? 0))
  const below = rect ? popoverTop >= rect.bottom : true
  const arrowLeft = rect ? rect.left + rect.width / 2 - parseFloat(String(style.left ?? 0)) : 0

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`Qué es ${label}`}
        className={`relative inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-current align-middle text-[11px] font-semibold italic leading-none opacity-55 transition-opacity hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 before:absolute before:-inset-[11px] before:content-[''] ${className}`}
      >
        <span aria-hidden="true" className="font-serif not-italic">i</span>
      </button>

      {open &&
        createPortal(
          <div
            {...{ [POPOVER_ATTR]: '' }}
            id={id}
            role="note"
            aria-live="polite"
            style={style}
            className="motion-safe:animate-[infohint-in_160ms_ease-out] rounded-xl bg-navy px-3.5 py-2.5 text-left text-[13px] leading-snug text-sand shadow-[0_12px_32px_-12px_rgba(8,58,79,0.55)] text-pretty dark:bg-surface-alt dark:text-foreground dark:ring-1 dark:ring-white/10"
          >
            <span
              aria-hidden="true"
              className={`absolute h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-inherit ${below ? '-top-1' : '-bottom-1'}`}
              style={{ left: Math.max(14, Math.min(arrowLeft, width - 14)) }}
            />
            <span className="relative">{children}</span>
          </div>,
          document.body,
        )}
    </>
  )
}
