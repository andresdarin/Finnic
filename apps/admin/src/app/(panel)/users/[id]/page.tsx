import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { AdminUserDetail } from '@lovehold/shared'
import { AdminApiError, adminFetch } from '@/lib/admin-api'
import { UserDetailView } from '@/features/users/components/UserDetailView'

export const metadata: Metadata = { title: 'Usuario' }

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await adminFetch<AdminUserDetail>(`/users/${encodeURIComponent(id)}`).catch((error) => {
    if (error instanceof AdminApiError && (error.status === 404 || error.status === 400)) notFound()
    throw error
  })

  return (
    <div className="space-y-5">
      <Link href="/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden size={15} /> Usuarios
      </Link>
      <UserDetailView user={user} />
    </div>
  )
}
