'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import FinnicOwlIcon from '@/components/ui/FinnicOwlIcon'
import { NEW_ACTIONS, type NewActionType } from './new-action/constants'
import { useNewAction } from './new-action/NewActionProvider'

interface GlobalActionSheetProps {
  isOpen: boolean
  onClose: () => void
}

/** Hoja "Nuevo Registro" del botón + móvil. Las acciones salen de NEW_ACTIONS. */
export default function GlobalActionSheet({ isOpen, onClose }: GlobalActionSheetProps) {
  const runAction = useNewAction()

  const handleAction = (type: NewActionType) => {
    onClose()
    runAction(type)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60"
          />

          {/* Bottom / Center Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-action-sheet-title"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md rounded-t-[2rem] sm:rounded-3xl bg-surface p-6 z-10 select-none pb-[calc(24px+env(safe-area-inset-bottom))]"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <FinnicOwlIcon color="navy" className="h-5 w-5" />
                <div>
                  <h3 id="global-action-sheet-title" className="text-sm font-bold tracking-tight text-foreground">Nuevo Registro</h3>
                  <p className="text-[11px] text-muted-foreground">Elegí la operación a realizar</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-surface-soft hover:text-foreground transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Acciones */}
            <div className="grid grid-cols-1 gap-2.5 pt-4">
              {NEW_ACTIONS.map(({ type, label, description, icon: Icon, badge, iconClass, cardClass }) => (
                <button
                  key={type}
                  onClick={() => handleAction(type)}
                  className={`flex items-center gap-3.5 p-3 rounded-2xl border active:scale-[0.99] transition-all text-left group ${cardClass}`}
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs group-hover:scale-105 transition-transform ${iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-foreground">{label}</p>
                      {badge && <span className="rounded-full bg-[#407E8C]/15 px-2 py-0.5 text-[10px] font-bold text-[#407E8C] dark:text-[#C0D5D6]">{badge}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{description}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
