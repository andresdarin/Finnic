'use client'

import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../theme/ThemeProvider'

interface ThemeToggleProps {
  variant?: 'surface' | 'dock' | 'auth'
}

/**
 * Toggle de tema animado (Sol / Luna) con variantes para Shell y Auth.
 */
export default function ThemeToggle({ variant = 'surface' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()

  let buttonStyles = 'rounded-xl border border-border bg-surface text-foreground hover:bg-surface-soft'
  if (variant === 'dock') {
    buttonStyles = 'rounded-full bg-surface text-foreground hover:bg-surface-soft'
  } else if (variant === 'auth') {
    buttonStyles = 'rounded-full border border-navy/10 bg-[#F5F2EE]/90 text-navy hover:border-navy/20 hover:bg-sand active:scale-[0.94] dark:border-white/10 dark:bg-surface/85 dark:text-aqua dark:hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-accent'
  }

  return (
    <button
      onClick={toggleTheme}
      className={`relative flex h-10 w-10 items-center justify-center transition-[background-color,border-color,scale] focus:outline-none ${buttonStyles}`}
      aria-label="Alternar tema"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ y: -6, opacity: 0, rotate: -45 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 6, opacity: 0, rotate: 45 }}
          transition={{ duration: 0.18 }}
          className="flex items-center justify-center text-navy dark:text-aqua"
        >
          {theme === 'light' ? (
            <Moon className="h-4 w-4 stroke-[2.2]" />
          ) : (
            <Sun className="h-4 w-4 stroke-[2.2]" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  )
}
