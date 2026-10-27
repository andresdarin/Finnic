import { requireAdmin } from '@/lib/auth'
import { AdminShell } from '@/features/shell/components/AdminShell'

// Cada request verifica sesión y rol: nada del panel se prerenderiza ni se cachea.
export const dynamic = 'force-dynamic'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requireAdmin()
  return <AdminShell email={email}>{children}</AdminShell>
}
