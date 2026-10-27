'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Home, CircleDollarSign, TrendingUp, WalletCards, Plus } from 'lucide-react'
import GlobalActionSheet from './GlobalActionSheet'

interface MobileNavProps {
  profile?: {
    displayName: string | null
    email: string
    color: string
    avatarUrl?: string | null
  } | null
  onAddClick?: () => void
}

interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ElementType
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Inicio', href: '/dashboard', icon: Home },
  { id: 'finanzas', label: 'Finanzas', href: '/finanzas', icon: CircleDollarSign },
  { id: 'balance', label: 'Balance', href: '/balance', icon: TrendingUp },
  { id: 'expenses', label: 'Movimientos', href: '/expenses', icon: WalletCards },
]

const SYNC_SPRING = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 32,
  mass: 0.5,
}

const MotionLink = motion.create(Link)

export default function MobileNav({ onAddClick }: MobileNavProps) {
  const pathname = usePathname()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    function handleScroll() {
      const currentScrollY = window.scrollY
      // Al scrollear hacia abajo (bajar en el contenido), el scrollY aumenta (> 45px)
      if (currentScrollY > 45 && currentScrollY > lastScrollY.current) {
        setIsCompact(true)
      } else if (currentScrollY < lastScrollY.current || currentScrollY <= 15) {
        setIsCompact(false)
      }
      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isItemActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/'
    }
    // Tranquilidad financiera vive dentro de Balance
    if (href === '/balance' && pathname.startsWith('/tranquilidad-financiera')) return true
    return pathname.startsWith(href) && (href !== '/expenses' || pathname !== '/expenses/new')
  }

  const handleAddPress = () => {
    if (onAddClick) {
      onAddClick()
    } else {
      setIsSheetOpen(true)
    }
  }

  return (
    <>
      <motion.nav
        aria-label="Navegación principal"
        initial={false}
        animate={{
          width: isCompact ? 'min(220px, 58vw)' : 'min(450px, 94vw)',
          height: isCompact ? 38 : 58,
        }}
        transition={SYNC_SPRING}
        className="fixed bottom-[calc(14px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 pointer-events-none lg:hidden flex items-center justify-center gap-2"
      >
        <LayoutGroup id="mobile-nav-group">
          {/* 1. Contenedor de tabs pill sincronizado */}
          <motion.div
            initial={false}
            animate={{
              height: isCompact ? 40 : 58,
              padding: isCompact ? '3px' : '5px',
            }}
            transition={SYNC_SPRING}
            className="pointer-events-auto flex-1 h-full bg-surface/90 border border-border/60 shadow-xl shadow-black/15 backdrop-blur-md rounded-full flex items-center justify-around gap-1"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = isItemActive(item.href)

              return (
                <MotionLink
                  key={item.id}
                  href={item.href}
                  layout
                  transition={SYNC_SPRING}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                  className={`relative flex items-center justify-center h-full rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive
                      ? isCompact
                        ? 'px-2.5 text-primary-foreground font-semibold'
                        : 'px-4 text-primary-foreground font-semibold'
                      : isCompact
                      ? 'px-2 text-muted-foreground hover:text-foreground'
                      : 'px-3 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobileNavActivePill"
                      className="absolute inset-0 rounded-full bg-primary"
                      transition={SYNC_SPRING}
                    />
                  )}

                  <motion.div
                    layout="position"
                    transition={SYNC_SPRING}
                    className="relative z-10 flex items-center gap-1.5"
                  >
                    <motion.div
                      initial={false}
                      animate={{
                        scale: isCompact ? 0.8 : 1,
                      }}
                      transition={SYNC_SPRING}
                      className="flex items-center justify-center"
                    >
                      <Icon className="h-5 w-5 shrink-0 stroke-[2.2]" />
                    </motion.div>

                    <AnimatePresence mode="popLayout" initial={false}>
                      {isActive && !isCompact && (
                        <motion.span
                          initial={{ opacity: 0, width: 0, filter: 'blur(4px)' }}
                          animate={{ opacity: 1, width: 'auto', filter: 'blur(0px)' }}
                          exit={{ opacity: 0, width: 0, filter: 'blur(4px)' }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          className="overflow-hidden whitespace-nowrap text-[13px] tracking-tight select-none"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </MotionLink>
              )
            })}
          </motion.div>
        </LayoutGroup>

        {/* 2. Botón circular '+' perfectamente sincronizado */}
        <motion.button
          type="button"
          onClick={handleAddPress}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.04 }}
          initial={false}
          animate={{
            height: isCompact ? 38 : 58,
            width: isCompact ? 38 : 58,
          }}
          transition={SYNC_SPRING}
          aria-label="Agregar movimiento"
          className="pointer-events-auto shrink-0 rounded-full bg-primary text-primary-foreground shadow-xl shadow-black/15 flex items-center justify-center hover:bg-primary-hover active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary overflow-hidden"
        >
          <motion.div
            initial={false}
            animate={{
              scale: isCompact ? 0.7 : 1,
            }}
            transition={SYNC_SPRING}
            className="flex items-center justify-center"
          >
            <Plus className="h-7 w-7 stroke-[2.5]" />
          </motion.div>
        </motion.button>
      </motion.nav>

      <GlobalActionSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
    </>
  )
}
