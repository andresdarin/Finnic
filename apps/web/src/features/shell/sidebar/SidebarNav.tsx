'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { NAV_ITEMS, navHrefFor } from './hooks'
import type { MutableRefObject } from 'react'

interface SidebarNavProps {
  collapsed: boolean
  profile: {
    displayName: string | null
    email: string
    color: string
    isAdmin?: boolean
    role?: string | null
  } | null
  navRef: MutableRefObject<HTMLElement | null>
  itemRefs: MutableRefObject<Record<string, HTMLAnchorElement | null>>
  indicator: { top: number; left: number; width: number; height: number; opacity: number }
  hoveredHref: string | null
  onHoverChange: (href: string | null) => void
}

export default function SidebarNav({ collapsed, profile, navRef, itemRefs, indicator, hoveredHref, onHoverChange }: SidebarNavProps) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter(
    (item) => (item.href !== '/finanzas' || profile) && (item.href !== '/ai' || profile?.isAdmin === true)
  )

  const activeHref = visibleItems.find((item) => navHrefFor(pathname) === item.href)?.href ?? '/dashboard'
  const targetHref = hoveredHref ?? activeHref

  return (
    <nav
      ref={navRef}
      onMouseLeave={() => onHoverChange(null)}
      className={`relative flex-1 space-y-2 ${collapsed ? 'py-6' : 'py-7'}`}
    >
      <motion.div
        className="pointer-events-none absolute z-0 rounded-full"
        animate={indicator}
        transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.55 }}
        aria-hidden="true"
      >
        <div className="h-full w-full rounded-full bg-surface-soft/70" />
      </motion.div>

      {visibleItems.map((item) => {
        const isActive = navHrefFor(pathname) === item.href
        const isTarget = targetHref === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            ref={(node) => { itemRefs.current[item.href] = node }}
            href={item.href}
            onMouseEnter={() => onHoverChange(item.href)}
            onFocus={() => onHoverChange(item.href)}
            onBlur={() => onHoverChange(null)}
            title={collapsed ? item.label : undefined}
            className={`group relative z-10 flex h-11 items-center rounded-full text-sm font-semibold transition-all duration-200 ${
              collapsed ? 'mx-auto w-11 justify-center' : 'gap-3 px-3'
            } ${
              isActive || isTarget
                ? 'text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                isActive || isTarget 
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface-soft group-hover:bg-surface-alt text-muted-foreground group-hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}
