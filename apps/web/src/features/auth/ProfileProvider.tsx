'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch, ApiError } from '@/lib/api'
import AppShell from '../shell/AppShell'
import FeatherLoading from '@/components/ui/FeatherLoading'
import FinnicErrorCard from '@/components/ui/FinnicErrorCard'

interface Profile {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  color: string
  createdAt: string
  role?: string | null
  isAdmin?: boolean
}

interface ProfileContextType {
  profile: Profile | null
  loading: boolean
  error: string | null
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  role: string | null
  isAdmin: boolean
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

/**
 * Proveedor de Perfil y Sesión para la zona autenticada.
 * Valida la autenticación, obtiene los datos del perfil y envuelve la UI en el AppShell.
 */
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  async function fetchProfile(token: string) {
    const me = await apiFetch<Profile>('/api/me', {}, token)
    setProfile(me)
    if (me.role) setRole(me.role)
    if (me.isAdmin === true || me.role?.toUpperCase() === 'ADMIN') setIsAdmin(true)
  }

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      router.push('/login')
      return
    }

    const claims = session.user.app_metadata ?? {}
    const jwtRole = typeof claims.role === 'string' ? claims.role : null
    setRole(jwtRole)
    setIsAdmin(claims.isAdmin === true || claims.admin === true || jwtRole?.toUpperCase() === 'ADMIN')

    try {
      try {
        await fetchProfile(session.access_token)
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) throw err
        // Cuenta sin perfil (ensure del login aún en vuelo, OAuth o un ensure fallido): se crea y se reintenta
        const meta = session.user.user_metadata ?? {}
        const displayName = meta.display_name ?? meta.full_name ?? meta.name
        await apiFetch('/api/profiles/ensure', {
          method: 'POST',
          body: JSON.stringify(displayName ? { displayName } : {}),
        }, session.access_token)
        await fetchProfile(session.access_token)
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await supabase.auth.signOut()
        router.push('/login')
        return
      }
      if (err instanceof ApiError && err.status === 404) {
        setError('Perfil no encontrado. Por favor, volvé a iniciar sesión.')
      } else {
        setError(err instanceof Error ? err.message : 'Error al cargar el perfil')
      }
    } finally {
      setLoading(false)
    }
  }, [router, supabase])

  useEffect(() => {
    load()
  }, [load])

  const handleRetry = () => {
    load()
  }

  async function refreshProfile() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      await fetchProfile(session.access_token)
    } catch {
      // Silently fail on refresh — data stays stale
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <FeatherLoading
          variant="fullscreen"
          message="Cargando tu espacio…"
          subtitle="Conectando con Finnic"
        />
      </main>
    )
  }

  if (error) {
    return (
      <FinnicErrorCard
        eyebrow="No pudimos conectar con tu espacio"
        title="Error de conexión"
        description={
          error === 'Failed to fetch'
            ? 'No pudimos comunicarnos con el servidor de Finnic. Comprobá tu conexión a internet o reintentá en unos segundos.'
            : error
        }
        onRetry={handleRetry}
        retryLabel="Reintentar"
        secondaryAction={{
          label: 'Cerrar sesión',
          onClick: logout,
          icon: <LogOut className="h-4 w-4 stroke-[2] text-muted-foreground" />,
        }}
      />
    )
  }

  return (
    <ProfileContext.Provider value={{ profile, loading, error, logout, refreshProfile, role, isAdmin }}>
      <AppShell profile={profile} onLogout={logout}>
        {children}
      </AppShell>
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile debe usarse dentro de un ProfileProvider')
  }
  return context
}
