import Link from 'next/link'
import type { AdminUserRow } from '@lovehold/shared'
import { formatDate, formatNumber, formatRelative } from '@/lib/format'
import { Flag } from './Flag'

const name = (u: AdminUserRow) => u.displayName || u.email.split('@')[0]

export function UsersTable({ users }: { users: AdminUserRow[] }) {
  if (users.length === 0) {
    return <p className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">No hay usuarios que coincidan.</p>
  }

  return (
    <>
      {/* Mobile: tarjetas */}
      <ul className="space-y-2 md:hidden">
        {users.map((u) => (
          <li key={u.id}>
            <Link href={`/users/${u.id}`} className="block rounded-2xl border border-border bg-surface p-4 hover:bg-surface-alt">
              <p className="font-medium">{name(u)}</p>
              <p className="truncate text-sm text-muted-foreground">{u.email}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Alta {formatDate(u.createdAt)} · Último acceso {formatRelative(u.lastSignInAt)} · {formatNumber(u.expenseCount)} gastos
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop: tabla */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-[13px] text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Usuario</th>
              <th scope="col" className="px-4 py-3 font-medium">Alta</th>
              <th scope="col" className="px-4 py-3 font-medium">Último acceso</th>
              <th scope="col" className="px-4 py-3 font-medium">Hogar</th>
              <th scope="col" className="px-4 py-3 font-medium">WhatsApp</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Gastos</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                <td className="max-w-[280px] px-4 py-3">
                  <Link href={`/users/${u.id}`} className="font-medium hover:underline">{name(u)}</Link>
                  <p className="truncate text-muted-foreground">{u.email}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3">{formatDate(u.createdAt)}</td>
                <td className="whitespace-nowrap px-4 py-3" title={formatDate(u.lastSignInAt, true)}>{formatRelative(u.lastSignInAt)}</td>
                <td className="px-4 py-3"><Flag on={u.hasHousehold} label="Hogar" /></td>
                <td className="px-4 py-3"><Flag on={u.whatsappLinked} label="WhatsApp" /></td>
                <td className="px-4 py-3 text-right tabular-nums">{formatNumber(u.expenseCount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
