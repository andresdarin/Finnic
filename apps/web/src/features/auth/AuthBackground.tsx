'use client'

import { FeatherRain } from '@/components/ui/FeatherRain'

/**
 * Background animado con plumas cayendo para vistas de autenticación,
 * sobre la base cálida Sand (claro) o Navy profundo (oscuro).
 */
export function AuthBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
      <div className="absolute inset-0 bg-[#F5F2EC] transition-colors duration-700 dark:bg-[#071A24]" />
      <div className="absolute -top-[20%] left-1/2 h-[600px] w-[90vw] -translate-x-1/2 rounded-full bg-sand/30 blur-3xl dark:bg-navy/20" />
      <FeatherRain featherClassName="filter dark:brightness-125 dark:invert" />
      <div className="absolute inset-0 backdrop-blur-[0.5px]" />
      <div className="absolute inset-0 bg-radial-[ellipse_at_center,_transparent_30%,_#F5F2EC_90%] opacity-70 dark:bg-radial-[ellipse_at_center,_transparent_30%,_#071A24_90%]" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-background/50" />
    </div>
  )
}
