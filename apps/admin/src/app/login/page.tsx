import type { Metadata } from 'next'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { LOGIN_ERRORS } from '@/features/auth/sign-in'

export const metadata: Metadata = { title: 'Ingresar' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <AuthCard title="Panel interno" description="Acceso solo para el equipo de Finnic.">
      <LoginForm error={(error && LOGIN_ERRORS[error]) || null} />
    </AuthCard>
  )
}
