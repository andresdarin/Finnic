'use client'

import { useState } from 'react'
import { useProfile } from '@/features/auth/ProfileProvider'
import { useGamification } from '@/features/gamification/hooks'
import { ProfileIdentitySidebar } from './ProfileIdentitySidebar'
import { FeaturedAchievements, getAchievementCounts } from './FeaturedAchievements'
import { NextGoalsCard } from './NextGoalsCard'
import { SettingsEntryCard } from './SettingsEntryCard'
import { EditProfileModal } from './EditProfileModal'
import { RankProgressCompact } from './RankProgressCompact'
import { ProfileMiniStats } from './ProfileMiniStats'
import { WhatsAppLinkCard } from './whatsapp/components/WhatsAppLinkCard'
import LiquidGlass from '@/components/ui/LiquidGlass'
import { APP_VERSION } from '@/lib/version'

/**
 * Editorial profile page orchestrator.
 * Implements a GitHub-inspired asymmetric 2-column layout.
 */
export default function ProfilePageClient() {
  const { profile, logout, refreshProfile } = useProfile()
  const { data: gamification, loading: gamificationLoading } = useGamification()
  const [editOpen, setEditOpen] = useState(false)

  const { unlocked, total } = getAchievementCounts()
  const isComplete = !!profile?.displayName

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="type-display text-2xl text-foreground">Perfil</h1>
        <p className="text-sm text-muted-foreground">Tu identidad y progreso financiero.</p>
      </header>

      {/* GitHub-inspired profile layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
        {/* Left Column: Identity Sidebar */}
        <ProfileIdentitySidebar
          displayName={profile?.displayName ?? null}
          email={profile?.email}
          avatarUrl={profile?.avatarUrl}
          color={profile?.color}
          createdAt={profile?.createdAt}
          onEdit={() => setEditOpen(true)}
          onAvatarUpdate={refreshProfile}
          unlockedAchievementsCount={unlocked}
        />

        {/* Right Column: Gamification, Stats, Achievements, Goals, Settings */}
        <div className="space-y-6">
          {/* Gamification & Progress Banner */}
          <LiquidGlass variant="card" intensity="medium" className="neu-raised p-6 border border-border/50 relative overflow-hidden">
            <div className="relative z-10">
              <RankProgressCompact
                data={gamification}
                loading={gamificationLoading}
              />
            </div>
            {/* Soft decorative ambient glow */}
            <div className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full blur-[80px] opacity-[0.05] pointer-events-none bg-primary" />
          </LiquidGlass>

          {/* Stats section */}
          <ProfileMiniStats
            gamification={gamification}
            isComplete={isComplete}
            unlockedAchievements={unlocked}
            totalAchievements={total}
          />

          {/* Achievements full section */}
          <FeaturedAchievements />

          {/* Goals & Settings */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <NextGoalsCard />
            <SettingsEntryCard email={profile?.email} onLogout={logout} />
          </div>

          <WhatsAppLinkCard />
        </div>
      </div>

      <EditProfileModal
        open={editOpen}
        currentName={profile?.displayName ?? null}
        onClose={() => setEditOpen(false)}
        onSaved={refreshProfile}
      />

      <p className="text-center text-xs text-muted-foreground/40 pt-4">
        v{APP_VERSION}
      </p>
    </div>
  )
}
