'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { useFloatingPopover } from './useFloatingPopover'

export interface SelectOption { value: string; label: string; hint?: string; disabled?: boolean }

interface Props {
  value: string; options: readonly SelectOption[]; onChange: (value: string) => void
  placeholder?: string; className?: string; popoverWidth?: number
  size?: 'sm' | 'md'; disabled?: boolean; id?: string; ariaLabel?: string
}

const POPOVER_ATTR = 'data-custom-select'

/**
 * Desplegable propio (patrón "select-only combobox" de WAI-ARIA): el foco queda en el botón
 * y la lista se recorre con flechas, Inicio/Fin y letras; Enter/Espacio elige, Escape cierra.
 * Reemplaza al <select> nativo para que la flecha y la lista sigan el diseño de la app.
 */
export default function CustomSelect({ value, options, onChange, placeholder, className = '', popoverWidth = 0, size = 'md', disabled = false, id, ariaLabel }: Props) {
  const generatedId = useId()
  const triggerId = id ?? `${generatedId}-trigger`
  const listId = `${generatedId}-list`
  const trigger = useRef<HTMLButtonElement>(null)
  const typeahead = useRef({ text: '', at: 0 })
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const enabled = options.map((option, index) => (option.disabled ? -1 : index)).filter(index => index >= 0)
  const selectedIndex = options.findIndex(option => option.value === value)
  const selected = options[selectedIndex]
  const style = useFloatingPopover(trigger, POPOVER_ATTR, popoverWidth, Math.min(options.length * 44 + 8, 288), open, () => setOpen(false))

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [open, active, listId])

  function openList() {
    if (disabled) return
    setActive(selectedIndex >= 0 ? selectedIndex : enabled[0] ?? -1)
    setOpen(true)
  }

  function choose(index: number) {
    const option = options[index]
    if (!option || option.disabled) return
    onChange(option.value)
    setOpen(false)
    trigger.current?.focus()
  }

  function move(delta: number) {
    if (!enabled.length) return
    const position = enabled.indexOf(active)
    const next = position < 0 ? (delta > 0 ? 0 : enabled.length - 1) : Math.min(enabled.length - 1, Math.max(0, position + delta))
    setActive(enabled[next] ?? -1)
  }

  function onKeyDown(event: KeyboardEvent) {
    const key = event.key
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) { event.preventDefault(); openList() }
      return
    }
    if (key === 'ArrowDown') { event.preventDefault(); move(1) }
    else if (key === 'ArrowUp') { event.preventDefault(); move(-1) }
    else if (key === 'Home') { event.preventDefault(); setActive(enabled[0] ?? -1) }
    else if (key === 'End') { event.preventDefault(); setActive(enabled[enabled.length - 1] ?? -1) }
    else if (key === 'Enter' || key === ' ') { event.preventDefault(); choose(active) }
    else if (key === 'Tab') setOpen(false)
    else if (key.length === 1) {
      const now = Date.now()
      const text = (now - typeahead.current.at < 600 ? typeahead.current.text : '') + key.toLowerCase()
      typeahead.current = { text, at: now }
      const match = enabled.find(index => options[index]?.label.toLowerCase().startsWith(text))
      if (match !== undefined) setActive(match)
    }
  }

  const height = size === 'sm' ? 'h-9 text-sm sm:text-xs' : 'h-11 text-base sm:text-sm'

  return (
    <div className={`relative ${className}`}>
      <button
        ref={trigger}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`neu-inset flex w-full items-center justify-between gap-2 rounded-2xl border border-border/50 bg-surface-soft/60 px-3.5 text-left font-medium text-foreground transition-colors focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 ${height}`}
      >
        <span className={`min-w-0 truncate ${selected ? '' : 'text-muted-foreground'}`}>{selected?.label ?? placeholder ?? 'Seleccionar'}</span>
        <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <ul
          {...{ [POPOVER_ATTR]: '' }}
          id={listId}
          role="listbox"
          aria-labelledby={triggerId}
          style={style}
          className="max-h-72 overflow-y-auto rounded-2xl border border-border/60 bg-surface p-1 shadow-[0_18px_40px_-16px_rgba(8,58,79,0.35)] motion-safe:animate-[infohint-in_140ms_ease-out] dark:shadow-black/50"
        >
          {options.map((option, index) => {
            const isSelected = index === selectedIndex
            return (
              <li
                key={`${option.value}-${index}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                onMouseEnter={() => !option.disabled && setActive(index)}
                onMouseDown={event => event.preventDefault()}
                onClick={() => choose(index)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${
                  option.disabled ? 'cursor-not-allowed text-muted-foreground' : index === active ? 'bg-surface-soft text-foreground' : 'text-foreground'
                }`}
              >
                <span className="min-w-0">
                  <span className={`block truncate ${isSelected ? 'font-semibold' : ''}`}>{option.label}</span>
                  {option.hint && <span className="block truncate text-xs text-muted-foreground">{option.hint}</span>}
                </span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
              </li>
            )
          })}
        </ul>,
        document.body,
      )}
    </div>
  )
}
