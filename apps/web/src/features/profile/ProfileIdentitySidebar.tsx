'use client'

import { Calendar, LogOut, Receipt, Clock, Trophy } from 'lucide-react'
import { useProfile } from '@/features/auth/ProfileProvider'
import { ProfileAvatarFeature } from './ProfileAvatarFeature'
import { formatMemberSince } from './utils'

interface ProfileIdentitySidebarProps {
  displayName: string | null
  email: string | undefined
  avatarUrl: string | null | undefined
  color: string | undefined
  createdAt: string | undefined
  onEdit: () => void
  onAvatarUpdate: (avatarUrl: string | null) => void
  unlockedAchievementsCount: number
}

const BADGES = [
  { Icon: Trophy, title: 'Primer movimiento', hint: 'Registraste tu primer gasto.' },
  { Icon: Receipt, title: 'Primer ticket', hint: 'Subiste tu primer ticket.' },
  { Icon: Clock, title: 'Gastos fijos al día', hint: 'Pagaste todos tus gastos recurrentes.' },
]

/**
 * Identidad del perfil: solo datos reales de la cuenta (nombre, usuario, antigüedad),
 * logros y cierre de sesión, que así queda disponible también en mobile.
 */
export function ProfileIdentitySidebar({
  displayName,
  email,
  avatarUrl,
  color,
  createdAt,
  onEdit,
  onAvatarUpdate,
  unlockedAchievementsCount,
}: ProfileIdentitySidebarProps) {
  const { logout } = useProfile()
  const username = email ? email.split('@')[0] : null

  return (
    <div className="flex flex-col gap-6 text-foreground">
      <div className="self-center lg:self-start">
        <ProfileAvatarFeature
          avatarUrl={avatarUrl}
          displayName={displayName}
          email={email}
          color={color}
          onAvatarUpdate={onAvatarUpdate}
        />
      </div>

      <div className="flex flex-col text-center lg:text-left">
        <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
          {displayName ?? 'Tu perfil'}
        </h2>
        {username && <p className="mt-0.5 text-base text-muted-foreground">{username}</p>}
      </div>

      <button
        type="button"
        onClick={onEdit}
        className="min-h-11 w-full rounded-lg border border-border/50 bg-surface-soft/20 px-4 text-sm font-semibold text-foreground transition-[background-color,scale] duration-200 hover:bg-surface-soft/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        Editar perfil
      </button>

      {createdAt && (
        <p className="flex items-center justify-center gap-2 border-b border-border/20 pb-5 text-xs text-muted-foreground lg:justify-start">
          <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
          Miembro desde {formatMemberSince(createdAt)}
        </p>
      )}

      <section aria-labelledby="profile-badges" className="border-b border-border/20 pb-5">
        <h3 id="profile-badges" className="mb-3 text-sm font-bold text-foreground">Logros</h3>
        <ul className="flex flex-wrap justify-center gap-2.5 lg:justify-start">
          {BADGES.map(({ Icon, title, hint }, index) => {
            const unlocked = unlockedAchievementsCount > index
            return (
              <li
                key={title}
                title={`${title}: ${hint}`}
                className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                  unlocked ? 'border-primary/30 bg-primary/[0.08] text-primary' : 'border-border/40 text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">{`${title}: ${unlocked ? 'desbloqueado' : 'pendiente'}`}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <button
        type="button"
        onClick={() => void logout()}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border/50 px-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-danger/40 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Cerrar sesión
      </button>
    </div>
  )
}
