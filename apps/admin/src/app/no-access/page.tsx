import type { Metadata } from 'next'
import { AuthCard } from '@/features/auth/components/AuthCard'

export const metadata: Metadata = { title: 'Sin acceso' }

export default function NoAccessPage() {
  return (
    <AuthCard title="Sin acceso" description="Esta cuenta no tiene permisos de administrador. Cerramos la sesión en este sitio.">
      <a
        href="/login"
        className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border text-[15px] font-semibold hover:bg-surface-alt"
      >
        Ingresar con otra cuenta
      </a>
    </AuthCard>
  )
}
