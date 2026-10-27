'use client'

import type { KeyboardEvent } from 'react'
import { TAB_LABELS } from '../constants'
import type { Tab } from '../types'

const TABS: Tab[] = ['gastar', 'guardar', 'llegar']

/** Selector de píldora (como UYU/USD) entre Gastar, Guardar y Llegar, operable con flechas. */
export function TranquilityTabs({ value, onChange }: { value: Tab; onChange: (tab: Tab) => void }) {
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const next =
      event.key === 'ArrowRight' ? TABS[(index + 1) % TABS.length]
      : event.key === 'ArrowLeft' ? TABS[(index + TABS.length - 1) % TABS.length]
      : event.key === 'Home' ? TABS[0]
      : event.key === 'End' ? TABS[TABS.length - 1]
      : null
    if (!next) return
    event.preventDefault()
    onChange(next)
    document.getElementById(`tab-${next}`)?.focus()
  }

  return (
    <div role="tablist" aria-label="Secciones de tranquilidad" className="flex rounded-full border border-border/40 bg-surface-soft/70 p-1 dark:bg-surface/60">
      {TABS.map((tab, index) => {
        const selected = value === tab
        return (
          <button
            key={tab}
            id={`tab-${tab}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`panel-${tab}`}
            tabIndex={selected ? 0 : -1}
            onKeyDown={event => onKeyDown(event, index)}
            onClick={() => onChange(tab)}
            className={`min-h-10 flex-1 rounded-full text-sm font-semibold transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              selected ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        )
      })}
    </div>
  )
}
