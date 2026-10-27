import type { Metadata } from 'next'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { LoginForm } from '@/features/auth/components/LoginForm'

export const metadata: Metadata = { title: 'Ingresar' }

export default function LoginPage() {
  return (
    <AuthCard title="Panel interno" description="Acceso solo para el equipo de Finnic.">
      <LoginForm />
    </AuthCard>
  )
}
