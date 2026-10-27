import type { Metadata } from 'next'
import type { AdminUserPage } from '@lovehold/shared'
import { adminFetch } from '@/lib/admin-api'
import { UserSearch } from '@/features/users/components/UserSearch'
import { UsersTable } from '@/features/users/components/UsersTable'
import { Pagination } from '@/features/users/components/Pagination'
import { parseUsersQuery } from '@/features/users/utils/query'

export const metadata: Metadata = { title: 'Usuarios' }

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const { page, q } = parseUsersQuery(await searchParams)
  const params = new URLSearchParams({ page: String(page), pageSize: '20', ...(q ? { q } : {}) })
  const data = await adminFetch<AdminUserPage>(`/users?${params}`)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">Usuarios</h1>
        <UserSearch q={q} />
      </div>
      <UsersTable users={data.items} />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} q={q} />
    </div>
  )
}
