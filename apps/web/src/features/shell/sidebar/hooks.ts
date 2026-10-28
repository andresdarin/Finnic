'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Home, Wallet, TrendingUp, Fuel, Target, Settings, BadgeDollarSign, Brain } from 'lucide-react'

export const NAV_ITEMS = [
  { label: 'Inicio', href: '/dashboard', icon: Home },
  { label: 'Finanzas Personales', href: '/finanzas', icon: BadgeDollarSign },
  { label: 'Movimientos', href: '/expenses', icon: Wallet },
  { label: 'Balance', href: '/balance', icon: TrendingUp },
  { label: 'Nafta', href: '/fuel', icon: Fuel },
  { label: 'Metas', href: '/goals', icon: Target },
  { label: 'Ajustes', href: '/settings', icon: Settings },
  { label: 'Finnic AI', href: '/ai', icon: Brain },
] as const

/** Pantallas que viven dentro de otra sección: Tranquilidad se abre desde Balance; el alta de gasto, desde Movimientos. */
const SECTION_ALIASES: Record<string, string> = { '/tranquilidad-financiera': '/balance', '/expenses/new': '/expenses' }

/** href del ítem de navegación que corresponde a la ruta actual. */
export function navHrefFor(pathname: string): string {
  const alias = Object.entries(SECTION_ALIASES).find(([path]) => pathname.startsWith(path))
  return alias ? alias[1] : pathname
}

export function useAnimatedIndicator(collapsed: boolean, activeHref: string) {
  const navRef = useRef<HTMLElement | null>(null)
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const [hoveredHref, setHoveredHref] = useState<string | null>(null)
  const [indicator, setIndicator] = useState({ top: 0, left: 0, width: 0, height: 0, opacity: 0 })

  const targetHref = hoveredHref ?? activeHref

  const updateIndicator = useCallback(() => {
    const nav = navRef.current
    const target = itemRefs.current[targetHref]
    if (!nav || !target) return
    const navRect = nav.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    setIndicator({
      top: targetRect.top - navRect.top,
      left: targetRect.left - navRect.left,
      width: targetRect.width,
      height: targetRect.height,
      opacity: 1,
    })
  }, [targetHref])

  useEffect(() => {
    let mounted = true
    let frameId: number | null = null

    // Esperar a que el browser resuelva layout de los refs
    frameId = window.requestAnimationFrame(() => {
      if (mounted) updateIndicator()
    })

    const timeout = window.setTimeout(() => {
      if (mounted) updateIndicator()
    }, 150)

    const handleResize = () => {
      if (mounted) updateIndicator()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      mounted = false
      if (frameId) window.cancelAnimationFrame(frameId)
      window.clearTimeout(timeout)
      window.removeEventListener('resize', handleResize)
    }
  }, [collapsed, updateIndicator])

  return { navRef, itemRefs, indicator, hoveredHref, setHoveredHref }
}
