import Link from 'next/link'
import PasswordForm from '@/features/auth/password/PasswordForm'

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <Link href="/profile" className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">Volver a mi perfil</Link>
      <header className="space-y-2"><h1 className="type-display text-2xl">Cambiar contraseña</h1><p className="text-sm text-muted-foreground">Confirmá tu contraseña actual y elegí una nueva.</p></header>
      <PasswordForm />
    </div>
  )
}
