'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, useAnimatedIndicator, navHrefFor } from './hooks'
import SidebarHeader from './SidebarHeader'
import SidebarNav from './SidebarNav'
import SidebarFooter from './SidebarFooter'
import SidebarFinnicButton from './SidebarFinnicButton'
import NewActionMenu from '../new-action/NewActionMenu'
import type { ShellProfile } from '../types'

interface SidebarProps {
  profile: ShellProfile | null
  onLogout: () => void
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ profile, onLogout, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const activeHref = NAV_ITEMS.filter((item) => item.href !== '/ai' || profile?.isAdmin === true)
    .find((item) => navHrefFor(pathname) === item.href)?.href ?? '/dashboard'
  const { navRef, itemRefs, indicator, hoveredHref, setHoveredHref } = useAnimatedIndicator(collapsed, activeHref)

  return (
    <aside
      className={`fixed bottom-5 left-5 top-5 z-30 hidden flex-col overflow-hidden rounded-[2rem] bg-surface/85 p-3 text-foreground transition-all duration-300 ease-in-out dark:bg-surface/90 lg:flex ${
        collapsed ? 'w-[84px]' : 'w-[248px]'
      }`}
    >
      <SidebarHeader collapsed={collapsed} onToggle={onToggle} />
      <NewActionMenu collapsed={collapsed} />
      <SidebarNav
        collapsed={collapsed}
        profile={profile}
        navRef={navRef}
        itemRefs={itemRefs}
        indicator={indicator}
        hoveredHref={hoveredHref}
        onHoverChange={setHoveredHref}
      />
      <SidebarFinnicButton collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} profile={profile} onLogout={onLogout} />
    </aside>
  )
}
