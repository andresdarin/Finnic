'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DollarSign, Globe, Palette, Mail, ShieldCheck, LogOut, Settings, ChevronDown } from 'lucide-react'
import LiquidGlass from '@/components/ui/LiquidGlass'
import { useTheme } from '@/features/theme/ThemeProvider'

interface SettingsEntryCardProps {
  email: string | undefined
  onLogout: () => void
}

/**
 * Compact, collapsible settings card for preferences and account info.
 * Stays out of focus by default — the user can expand to see details.
 */
export function SettingsEntryCard({ email, onLogout }: SettingsEntryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { theme } = useTheme()

  return (
    <LiquidGlass variant="card" intensity="medium" className="neu-raised p-5 border border-border/50">
      {/* Collapsed summary header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg -m-1 p-1"
        aria-expanded={expanded}
        aria-label="Configurar cuenta y preferencias"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-soft/60 border border-border/40">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Configuración</h3>
            <p className="text-[11px] text-muted-foreground">Preferencias y cuenta</p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-border/30 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Preferences */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preferencias</p>
            <div className="grid grid-cols-2 gap-2">
              <SettingsRow icon={DollarSign} label="Moneda" value="UYU" />
              <SettingsRow icon={Globe} label="Locale" value="es-UY" />
              <SettingsRow icon={Globe} label="Formato" value="$ 1.234,56" />
              <SettingsRow icon={Palette} label="Tema" value={theme === 'dark' ? 'Oscuro' : 'Claro'} />
            </div>
          </div>

          {/* Account */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cuenta</p>
            <div className="grid grid-cols-2 gap-2">
              <SettingsRow icon={Mail} label="Email" value={email ? email.split('@')[0] + '…' : '—'} />
              <SettingsRow icon={ShieldCheck} label="Sesión" value="Activa" valueColor="text-success" />
            </div>
          </div>

          {/* Logout */}
          <Link href="/settings" className="flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"><ShieldCheck size={16} />Cambiar contraseña</Link>
          <button
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-danger/20 bg-danger/5 px-4 py-2.5 text-xs font-semibold text-danger/70 transition-all duration-200 hover:border-danger/40 hover:bg-danger/10 hover:text-danger active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        </div>
      )}
    </LiquidGlass>
  )
}

function SettingsRow({
  icon: Icon,
  label,
  value,
  valueColor = 'text-foreground',
}: {
  icon: typeof Mail
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-surface-soft/20 px-3 py-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-xs font-semibold truncate ${valueColor}`}>{value}</p>
      </div>
    </div>
  )
}
